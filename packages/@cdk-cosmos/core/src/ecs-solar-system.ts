import { Construct } from '@aws-cdk/core';
import { InstanceType, SecurityGroup, Peer } from '@aws-cdk/aws-ec2';
import { Cluster, ICluster, ClusterProps, AddCapacityOptions, CpuUtilizationScalingProps } from '@aws-cdk/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ApplicationProtocol,
  IApplicationLoadBalancer,
  IApplicationListener,
  ApplicationLoadBalancerProps,
  ContentType,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { ARecord, RecordTarget } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { IGalaxyCore, IGalaxyExtension } from './galaxy';
import {
  ISolarSystemCore,
  ISolarSystemExtension,
  SolarSystemCoreStack,
  SolarSystemCoreStackProps,
  ImportedSolarSystemCore,
  SolarSystemExtensionStack,
  ImportedSolarSystemCoreProps,
  SolarSystemExtensionStackProps,
} from './solar-system';
import { CoreVpcProps, addEcsEndpoints } from './components/core-vpc';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from './helpers/remote';

export interface IEcsSolarSystemCore extends ISolarSystemCore {
  cluster: ICluster;
  alb: IApplicationLoadBalancer;
  httpListener: IApplicationListener;
  httpInternalListener: IApplicationListener;
  httpsListener: IApplicationListener;
  httpsInternalListener: IApplicationListener;
}

export interface IEcsSolarSystemExtension extends ISolarSystemExtension {
  portal: IEcsSolarSystemCore;
}

export interface EcsSolarSystemCoreProps extends SolarSystemCoreStackProps {
  clusterProps?: Partial<ClusterProps>;
  clusterCapacityProps?: Partial<AddCapacityOptions>;
  albProps?: Partial<ApplicationLoadBalancerProps>;
  listenerInboundCidr?: string;
}

export class EcsSolarSystemCoreStack extends SolarSystemCoreStack implements IEcsSolarSystemCore {
  readonly cluster: Cluster;
  readonly clusterAutoScalingGroup: AutoScalingGroup;
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpInternalListener: ApplicationListener;
  readonly httpsListener: ApplicationListener;
  readonly httpsInternalListener: ApplicationListener;

  constructor(galaxy: IGalaxyCore, id: string, props?: EcsSolarSystemCoreProps) {
    super(galaxy, id, {
      description: 'Cosmos EcsSolarSystem: Resources dependant on each App Env, like ECS & ALB',
      ...props,
    });

    const {
      listenerInboundCidr = '0.0.0.0/0',
      vpcProps = {},
      clusterProps = {},
      clusterCapacityProps = {},
      albProps = {},
    } = props || {};
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

    this.clusterAutoScalingGroup = this.cluster.addCapacity('Capacity', {
      vpcSubnets: { subnetGroupName: 'App' },
      instanceType: new InstanceType('t3.medium'),
      minCapacity: 1,
      maxCapacity: 5,
      ...clusterCapacityProps,
    });

    this.clusterAutoScalingGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));

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
      open: false,
    });

    this.httpInternalListener = this.alb.addListener('HttpInternalListener', {
      protocol: ApplicationProtocol.HTTP,
      port: 8080,
      open: false,
    });

    if (this.certificate !== undefined) {
      this.httpsListener = this.alb.addListener('HttpsListener', {
        port: 443,
        protocol: ApplicationProtocol.HTTPS,
        certificates: [this.certificate],
        open: false,
      });
      this.httpsInternalListener = this.alb.addListener('HttpsInternalListener', {
        port: 8443,
        protocol: ApplicationProtocol.HTTPS,
        certificates: [this.certificate],
        open: false,
      });
      RemoteApplicationListener.export(this.httpsListener, this.singletonId('HttpsListener'));
      RemoteApplicationListener.export(this.httpsInternalListener, this.singletonId('HttpsInternalListener'));
    }

    [this.httpListener, this.httpInternalListener, this.httpsListener, this.httpsInternalListener]
      .filter(listener => listener)
      .forEach(listener => this.configureListener(listener, listenerInboundCidr));

    RemoteCluster.export(this.cluster, this.singletonId('Cluster'));
    RemoteAlb.export(this.alb, this.singletonId('Alb'));
    RemoteApplicationListener.export(this.httpListener, this.singletonId('HttpListener'));
    RemoteApplicationListener.export(this.httpInternalListener, this.singletonId('HttpInternalListener'));
  }

  private configureListener(listener: ApplicationListener, listenerInboundCidr?: string | null): void {
    listener.addFixedResponse('Default', {
      statusCode: '404',
      contentType: ContentType.TEXT_PLAIN,
      messageBody: 'Route Not Found.',
    });
    if (listenerInboundCidr) {
      listener.connections.allowDefaultPortFrom(Peer.ipv4(listenerInboundCidr));
    } else {
      listener.connections.allowDefaultPortFrom(Peer.anyIpv4());
    }
  }

  addCpuAutoScaling(props: Partial<CpuUtilizationScalingProps>): void {
    this.clusterAutoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
  }

  // TODO: addMemoryScaling when monitory and metrics task is done (custom metric needed ?)
}

export class ImportedEcsSolarSystemCore extends ImportedSolarSystemCore implements IEcsSolarSystemCore {
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  readonly httpInternalListener: IApplicationListener;
  readonly httpsListener: IApplicationListener;
  readonly httpsInternalListener: IApplicationListener;

  constructor(scope: Construct, id: string, galaxy: IGalaxyCore, props?: ImportedSolarSystemCoreProps) {
    super(scope, id, galaxy, props);

    this.cluster = RemoteCluster.import(this, this.singletonId('Cluster'), this.vpc);
    this.alb = RemoteAlb.import(this, this.singletonId('Alb'));
    this.httpListener = RemoteApplicationListener.import(this, this.singletonId('HttpListener'));
    this.httpInternalListener = RemoteApplicationListener.import(this, this.singletonId('HttpInternalListener'));
    this.httpsListener = RemoteApplicationListener.import(this, this.singletonId('HttpsListener'));
    this.httpsInternalListener = RemoteApplicationListener.import(this, this.singletonId('HttpsInternalListener'));
  }
}

export class EcsSolarSystemExtensionStack extends SolarSystemExtensionStack implements IEcsSolarSystemExtension {
  readonly portal: IEcsSolarSystemCore;

  constructor(galaxy: IGalaxyExtension, id: string, props?: SolarSystemExtensionStackProps) {
    super(galaxy, id, {
      description:
        'Cosmos EcsSolarSystem Extension: App resources dependant on each App Env, like Services and Databases.',
      ...props,
    });

    const { portalProps } = props || {};

    this.node.tryRemoveChild(this.portal.node.id);
    this.portal = new ImportedEcsSolarSystemCore(this, 'Default', this.galaxy.portal, portalProps);
  }
}
