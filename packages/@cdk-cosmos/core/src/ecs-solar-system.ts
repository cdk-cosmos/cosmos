import { Construct, StackProps } from '@aws-cdk/core';
import { InstanceType, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Cluster, ICluster } from '@aws-cdk/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ApplicationTargetGroup,
  ApplicationProtocol,
  TargetType,
  IApplicationLoadBalancer,
  IApplicationListener,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import {
  RESOLVE,
  PATTERN,
  Galaxy,
  GalaxyExtension,
  EcsSolarSystem,
  EcsSolarSystemExtension,
  SolarSystemStack,
  SolarSystemProps,
  ImportedSolarSystem,
  SolarSystemExtensionStack,
  RemoteCluster,
  RemoteAlb,
  RemoteApplicationListener,
} from '.';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EcsSolarSystemProps extends SolarSystemProps {
  clusterProps?: {
    desiredCapacity?: number;
    minCapacity?: number;
    maxCapacity?: number;
  };
}

export class EcsSolarSystemStack extends SolarSystemStack implements EcsSolarSystem {
  readonly Cluster: Cluster;
  readonly Alb: ApplicationLoadBalancer;
  readonly HttpListener: ApplicationListener;
  // readonly HttpsListener: ApplicationListener;

  constructor(galaxy: Galaxy, name: string, props?: EcsSolarSystemProps) {
    super(galaxy, name, props);

    this.Cluster = new Cluster(this, 'Cluster', {
      vpc: this.Vpc,
      clusterName: RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster', this),
    });

    this.Cluster.addCapacity('Capacity', {
      instanceType: new InstanceType('t2.medium'),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 5,
    });

    const AlbSecurityGroup = new SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.Vpc,
      description: 'SecurityGroup for SolarSystem ALB',
      allowAllOutbound: true,
    });

    this.Alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpc: this.Vpc,
      loadBalancerName: RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb', this),
      securityGroup: AlbSecurityGroup,
    });

    this.HttpListener = this.Alb.addListener('HttpListener', {
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [
        new ApplicationTargetGroup(this, 'DefaultTargetGroup', {
          vpc: this.Vpc,
          protocol: ApplicationProtocol.HTTP,
          targetType: TargetType.INSTANCE,
        }),
      ],
    });

    // TODO: ?
    // this.httpListener = this.alb.addListener("HttpsListener", {
    //   port: 443,
    //   open: true
    // });

    RemoteCluster.export(this.Cluster, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster', this));
    RemoteAlb.export(this.Alb, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb', this));
    RemoteApplicationListener.export(this.HttpListener, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener', this));
  }
}

export class ImportedEcsSolarSystem extends ImportedSolarSystem implements EcsSolarSystem {
  readonly Cluster: ICluster;
  readonly Alb: IApplicationLoadBalancer;
  readonly HttpListener: IApplicationListener;
  // readonly HttpsListener: IApplicationListener;

  constructor(scope: Construct, galaxy: Galaxy, name: string) {
    super(scope, galaxy, name);

    this.Cluster = RemoteCluster.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster', this), this.Vpc);
    this.Alb = RemoteAlb.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb', this));
    this.HttpListener = RemoteApplicationListener.import(
      this,
      RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener', this)
    );
  }
}

export class EcsSolarSystemExtensionStack extends SolarSystemExtensionStack implements EcsSolarSystemExtension {
  readonly Portal: EcsSolarSystem;

  constructor(galaxy: GalaxyExtension, name: string, props?: StackProps) {
    super(galaxy, name, props);

    this.node.tryRemoveChild(this.Portal.node.id);

    this.Portal = new ImportedEcsSolarSystem(this, this.Galaxy.Portal, this.Name);
  }
}
