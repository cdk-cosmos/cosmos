import { Construct } from '@aws-cdk/core';
import { InstanceType, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Cluster, ICluster, ClusterProps, AddCapacityOptions } from '@aws-cdk/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ApplicationTargetGroup,
  ApplicationProtocol,
  TargetType,
  IApplicationLoadBalancer,
  IApplicationListener,
  ApplicationLoadBalancerProps,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { ARecord, RecordTarget } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import { IGalaxyCore, IGalaxyExtension } from './galaxy';
import {
  ISolarSystemCore,
  ISolarSystemExtension,
  SolarSystemCoreStack,
  SolarSystemCoreStackProps,
  ImportedSolarSystemCore,
  SolarSystemExtensionStack,
} from './solar-system';
import { CoreVpcProps, addEcsEndpoints } from './components/core-vpc';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from './helpers/remote';
import { BaseStackOptions } from './components/base';

export interface IEcsSolarSystemCore extends ISolarSystemCore {
  cluster: ICluster;
  alb: IApplicationLoadBalancer;
  httpListener: IApplicationListener;
  // HttpsListener: IApplicationListener;
}

export interface IEcsSolarSystemExtension extends ISolarSystemExtension {
  portal: IEcsSolarSystemCore;
}

export interface EcsSolarSystemCoreProps extends SolarSystemCoreStackProps {
  vpcProps?: Partial<CoreVpcProps> & {
    defaultEndpoints?: boolean;
  };
  clusterProps?: Partial<ClusterProps>;
  clusterCapacityProps?: Partial<AddCapacityOptions>;
  albProps?: Partial<ApplicationLoadBalancerProps>;
}

export class EcsSolarSystemCoreStack extends SolarSystemCoreStack implements IEcsSolarSystemCore {
  readonly cluster: Cluster;
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  // readonly HttpsListener: ApplicationListener;

  constructor(galaxy: IGalaxyCore, id: string, props?: EcsSolarSystemCoreProps) {
    super(galaxy, id, props);

    const { vpcProps = {}, clusterProps = {}, clusterCapacityProps = {}, albProps = {} } = props || {};
    const { defaultEndpoints = true } = vpcProps;

    // Only add endpoints if this component owens the Vpc.
    if (this.vpc.node.scope === this) {
      if (defaultEndpoints) addEcsEndpoints(this.vpc);
    }

    this.cluster = new Cluster(this, 'Cluster', {
      ...clusterProps,
      clusterName: this.singletonId('Cluster'),
      vpc: this.vpc,
    });

    const capacity = this.cluster.addCapacity('Capacity', {
      vpcSubnets: { subnetGroupName: 'App' },
      instanceType: new InstanceType('t2.medium'),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 5,
      ...clusterCapacityProps,
    });
    capacity.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));

    const albSecurityGroup =
      albProps.securityGroup ||
      new SecurityGroup(this, 'AlbSecurityGroup', {
        vpc: this.vpc,
        description: 'SecurityGroup for ALB.',
        allowAllOutbound: true,
      });

    this.alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpcSubnets: { subnetGroupName: 'App' },
      ...albProps,
      vpc: this.vpc,
      securityGroup: albSecurityGroup,
      loadBalancerName: this.singletonId('Alb'),
    });

    new ARecord(this, 'AlbRecord', {
      zone: this.zone,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(this.alb)),
    });

    this.httpListener = this.alb.addListener('HttpListener', {
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [
        new ApplicationTargetGroup(this, 'DefaultTargetGroup', {
          vpc: this.vpc,
          protocol: ApplicationProtocol.HTTP,
          targetType: TargetType.INSTANCE,
        }),
      ],
    });

    // TODO: Add internal http listener on port 81 ?

    // TODO: ?
    // this.httpListener = this.alb.addListener("HttpsListener", {
    //   port: 443,
    //   open: true
    // });

    RemoteCluster.export(this.cluster, this.singletonId('Cluster'));
    RemoteAlb.export(this.alb, this.singletonId('Alb'));
    RemoteApplicationListener.export(this.httpListener, this.singletonId('HttpListener'));
  }
}

export class ImportedEcsSolarSystemCore extends ImportedSolarSystemCore implements IEcsSolarSystemCore {
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  // readonly HttpsListener: IApplicationListener;

  constructor(scope: Construct, id: string, galaxy: IGalaxyCore) {
    super(scope, id, galaxy);

    this.cluster = RemoteCluster.import(this, this.singletonId('Cluster'), this.vpc);
    this.alb = RemoteAlb.import(this, this.singletonId('Alb'));
    this.httpListener = RemoteApplicationListener.import(this, this.singletonId('HttpListener'));
  }
}

export class EcsSolarSystemExtensionStack extends SolarSystemExtensionStack implements IEcsSolarSystemExtension {
  readonly portal: IEcsSolarSystemCore;

  constructor(galaxy: IGalaxyExtension, id: string, props?: BaseStackOptions) {
    super(galaxy, id, props);

    this.node.tryRemoveChild(this.portal.node.id);
    this.portal = new ImportedEcsSolarSystemCore(this, 'Default', this.galaxy.portal);
  }
}
