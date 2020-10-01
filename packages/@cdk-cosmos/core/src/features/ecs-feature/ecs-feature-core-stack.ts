import { Construct } from '@aws-cdk/core';
import { InstanceType, SecurityGroup, Peer, InstanceClass, InstanceSize, Vpc } from '@aws-cdk/aws-ec2';
import { Cluster, ICluster, ClusterProps as EcsClusterProps, AddCapacityOptions } from '@aws-cdk/aws-ecs';
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
import { AutoScalingGroup, UpdateType } from '@aws-cdk/aws-autoscaling';
import { Key } from '@aws-cdk/aws-kms';
import { ISolarSystemCore, SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { CoreVpc } from '../../components/core-vpc';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from '../../components/remote';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';

export interface IEcsFeatureCore extends Construct {
  readonly solarSystem: ISolarSystemCore;
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  readonly httpInternalListener: IApplicationListener;
  readonly httpsListener?: IApplicationListener;
  readonly httpsInternalListener?: IApplicationListener;
}

export interface ClusterProps extends Partial<Omit<EcsClusterProps, 'capacity'>> {
  capacity?: Partial<AddCapacityOptions> | false;
}

export interface EcsSolarSystemCoreStackProps extends BaseFeatureStackProps {
  clusterProps?: ClusterProps;
  albProps?: Partial<ApplicationLoadBalancerProps>;
  albListenerCidr?: string;
}

export class EcsFeatureCoreStack extends BaseFeatureStack implements IEcsFeatureCore {
  readonly solarSystem: ISolarSystemCore;
  readonly cluster: Cluster;
  readonly clusterAutoScalingGroup?: AutoScalingGroup;
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpInternalListener: ApplicationListener;
  readonly httpsListener?: ApplicationListener;
  readonly httpsInternalListener?: ApplicationListener;

  constructor(solarSystem: ISolarSystemCore, id: string, props?: EcsSolarSystemCoreStackProps) {
    super(solarSystem, id, {
      description: 'Adds Ecs Features to the SolarSystem',
      ...props,
    });

    const { albListenerCidr = '0.0.0.0/0', clusterProps = {}, albProps = {} } = props || {};

    this.solarSystem = solarSystem;

    CoreVpc.addEcsEndpoints(this.solarSystem.vpc);

    this.cluster = new Cluster(this, 'Cluster', {
      containerInsights: true,
      ...clusterProps,
      clusterName: this.singletonId('Cluster'),
      vpc: this.solarSystem.vpc,
      capacity:
        clusterProps.capacity !== false
          ? {
              vpcSubnets: { subnetGroupName: 'App' },
              instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
              minCapacity: 1,
              maxCapacity: this.solarSystem.vpc.availabilityZones.length * 2,
              updateType: UpdateType.ROLLING_UPDATE,
              topicEncryptionKey:
                this.solarSystem.galaxy.sharedKey &&
                Key.fromKeyArn(this, 'SharedKey', this.solarSystem.galaxy.sharedKey.keyArn),
              ...clusterProps.capacity,
            }
          : undefined,
    });
    this.clusterAutoScalingGroup = this.cluster.autoscalingGroup as AutoScalingGroup | undefined;

    if (this.clusterAutoScalingGroup) {
      this.clusterAutoScalingGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));
    }

    const albSecurityGroup =
      albProps.securityGroup ||
      new SecurityGroup(this, 'AlbSecurityGroup', {
        vpc: this.solarSystem.vpc,
        description: 'SecurityGroup for ALB.',
        allowAllOutbound: true,
      });

    this.alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpcSubnets: { subnetGroupName: 'App' },
      ...albProps,
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

    for (const listener of [
      this.httpListener,
      this.httpInternalListener,
      this.httpsListener,
      this.httpsInternalListener,
    ]) {
      if (listener) configureListener(listener, albListenerCidr);
    }

    RemoteCluster.export(this.cluster, this.singletonId('Cluster'));
    RemoteAlb.export(this.alb, this.singletonId('Alb'));
    RemoteApplicationListener.export(this.httpListener, this.singletonId('HttpListener'));
    RemoteApplicationListener.export(this.httpInternalListener, this.singletonId('HttpInternalListener'));
  }
}

const configureListener = (listener: ApplicationListener, listenerInboundCidr?: string | null): void => {
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
};

declare module '../../solar-system/solar-system-core-stack' {
  export interface ISolarSystemCore {
    readonly ecs?: IEcsFeatureCore;
  }
  interface SolarSystemCoreStack {
    ecs?: EcsFeatureCoreStack;
    addEcs(props?: EcsSolarSystemCoreStackProps): EcsFeatureCoreStack;
  }
}

SolarSystemCoreStack.prototype.addEcs = function(props?: EcsSolarSystemCoreStackProps): EcsFeatureCoreStack {
  this.ecs = new EcsFeatureCoreStack(this, 'Ecs', props);
  return this.ecs;
};
