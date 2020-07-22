import { InstanceType, SecurityGroup, Peer, InstanceClass, InstanceSize } from '@aws-cdk/aws-ec2';
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
import { ISolarSystemCore } from '../../solar-system-core-stack';
import { addEcsEndpoints } from '../../../components/core-vpc';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from '../../../helpers/remote';
import { defaultProps } from '../../../helpers/utils';
import { BaseNestedStack, BaseNestedStackProps } from '../../../components/base';

export interface IEcsSolarSystemCore {
  readonly solarSystem: ISolarSystemCore;
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  readonly httpInternalListener: IApplicationListener;
  readonly httpsListener?: IApplicationListener;
  readonly httpsInternalListener?: IApplicationListener;
}

export interface EcsSolarSystemCoreProps extends BaseNestedStackProps {
  vpcProps?: { defaultEndpoints?: boolean };
  clusterProps?: Partial<ClusterProps>;
  clusterCapacityProps?: Partial<AddCapacityOptions>;
  albProps?: Partial<ApplicationLoadBalancerProps>;
  albListenerCidr?: string;
}

export class EcsSolarSystemCoreStack extends BaseNestedStack implements IEcsSolarSystemCore {
  readonly solarSystem: ISolarSystemCore;
  readonly props: EcsSolarSystemCoreProps;
  readonly cluster: Cluster;
  readonly clusterAutoScalingGroup: AutoScalingGroup;
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpInternalListener: ApplicationListener;
  readonly httpsListener?: ApplicationListener;
  readonly httpsInternalListener?: ApplicationListener;

  constructor(solarSystem: ISolarSystemCore, id: string, props?: EcsSolarSystemCoreProps) {
    props = defaultProps<EcsSolarSystemCoreProps>(
      {
        vpcProps: {
          defaultEndpoints: true,
        },
        albListenerCidr: '0.0.0.0/0',
      },
      props,
      { type: 'Feature' }
    );
    super(solarSystem, id, props);

    this.solarSystem = solarSystem;
    this.props = props;

    // Only add endpoints if this component owens the Vpc.
    if (this.solarSystem.vpc.node.scope === this) {
      if (this.props.vpcProps?.defaultEndpoints) addEcsEndpoints(this.solarSystem.vpc);
    }

    this.cluster = new Cluster(this, 'Cluster', {
      containerInsights: true,
      ...this.props.clusterProps,
      clusterName: this.singletonId('Cluster'),
      vpc: this.solarSystem.vpc,
    });

    this.clusterAutoScalingGroup = this.cluster.addCapacity('Capacity', {
      vpcSubnets: { subnetGroupName: 'App' },
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
      minCapacity: 1,
      maxCapacity: 5,
      ...this.props.clusterCapacityProps,
    });

    this.clusterAutoScalingGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));

    const albSecurityGroup =
      this.props.albProps?.securityGroup ||
      new SecurityGroup(this, 'AlbSecurityGroup', {
        vpc: this.solarSystem.vpc,
        description: 'SecurityGroup for ALB.',
        allowAllOutbound: true,
      });

    this.alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpcSubnets: { subnetGroupName: 'App' },
      ...this.props.albProps,
      vpc: this.solarSystem.vpc,
      securityGroup: albSecurityGroup,
      loadBalancerName: this.singletonId('Alb'),
    });

    new ARecord(this, 'AlbRecord', {
      zone: this.solarSystem.zone,
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

    if (this.solarSystem.certificate !== undefined) {
      this.httpsListener = this.alb.addListener('HttpsListener', {
        port: 443,
        protocol: ApplicationProtocol.HTTPS,
        certificates: [this.solarSystem.certificate],
        open: false,
      });
      this.httpsInternalListener = this.alb.addListener('HttpsInternalListener', {
        port: 8443,
        protocol: ApplicationProtocol.HTTPS,
        certificates: [this.solarSystem.certificate],
        open: false,
      });
      RemoteApplicationListener.export(this.httpsListener, this.singletonId('HttpsListener'));
      RemoteApplicationListener.export(this.httpsInternalListener, this.singletonId('HttpsInternalListener'));
    }

    [this.httpListener, this.httpInternalListener, this.httpsListener, this.httpsInternalListener]
      .filter(listener => listener)
      .forEach(listener => this.configureListener(listener as ApplicationListener, this.props.albListenerCidr));

    RemoteCluster.export(this.cluster, this.singletonId('Cluster'));
    RemoteAlb.export(this.alb, this.singletonId('Alb'));
    RemoteApplicationListener.export(this.httpListener, this.singletonId('HttpListener'));
    RemoteApplicationListener.export(this.httpInternalListener, this.singletonId('HttpInternalListener'));
  }

  addCpuAutoScaling(props: Partial<CpuUtilizationScalingProps>): void {
    this.clusterAutoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
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
}
