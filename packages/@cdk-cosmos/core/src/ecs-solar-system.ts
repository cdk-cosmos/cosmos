import { Construct, StackProps } from '@aws-cdk/core';
import { InstanceType } from '@aws-cdk/aws-ec2';
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
export interface EcsSolarSystemProps extends SolarSystemProps {}

export class EcsSolarSystemStack extends SolarSystemStack implements EcsSolarSystem {
  readonly Cluster: Cluster;
  readonly Alb: ApplicationLoadBalancer;
  readonly HttpListener: ApplicationListener;
  // readonly HttpsListener: ApplicationListener;

  constructor(galaxy: Galaxy, name: string, props?: EcsSolarSystemProps) {
    super(galaxy, name, props);

    this.Cluster = new Cluster(this, 'Cluster', {
      vpc: this.Vpc,
      clusterName: `Core-${this.Galaxy.Name}-${this.Name}-Cluster`,
    });

    this.Cluster.addCapacity('Capacity', {
      instanceType: new InstanceType('t2.medium'),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 5,
    });

    this.Alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpc: this.Vpc,
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

    RemoteCluster.export(`Cosmos${this.Galaxy.Name}${this.Name}Core`, this.Cluster);
    RemoteAlb.export(`Cosmos${this.Galaxy.Name}${this.Name}Core`, this.Alb);
    RemoteApplicationListener.export(`Cosmos${this.Galaxy.Name}${this.Name}Core`, this.HttpListener);
  }
}

export class ImportedEcsSolarSystem extends ImportedSolarSystem implements EcsSolarSystem {
  readonly Cluster: ICluster;
  readonly Alb: IApplicationLoadBalancer;
  readonly HttpListener: IApplicationListener;
  // readonly HttpsListener: IApplicationListener;

  constructor(scope: Construct, galaxy: Galaxy, name: string) {
    super(scope, galaxy, name);

    this.Cluster = RemoteCluster.import(this, `Cosmos${this.Galaxy.Name}${this.Name}Core`, 'Cluster', this.Vpc);
    this.Alb = RemoteAlb.import(this, `Cosmos${this.Galaxy.Name}${this.Name}Core`, 'Alb');
    this.HttpListener = RemoteApplicationListener.import(
      this,
      `Cosmos${this.Galaxy.Name}${this.Name}Core`,
      'HttpListener'
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
