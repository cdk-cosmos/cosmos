import { Construct, StackProps } from '@aws-cdk/core';
import { InstanceType, SecurityGroup, InterfaceVpcEndpointAwsService } from '@aws-cdk/aws-ec2';
import { Cluster, ICluster, ClusterProps, AddCapacityOptions } from '@aws-cdk/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ApplicationTargetGroup,
  ApplicationProtocol,
  TargetType,
  IApplicationLoadBalancer,
  IApplicationListener,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import {
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
  vpcProps?: SolarSystemProps['vpcProps'] & {
    defaultEndpoints?: boolean;
  };
  clusterProps?: Partial<ClusterProps>;
  clusterCapacityProps?: Partial<AddCapacityOptions>;
}

export class EcsSolarSystemStack extends SolarSystemStack implements EcsSolarSystem {
  readonly Cluster: Cluster;
  readonly Alb: ApplicationLoadBalancer;
  readonly HttpListener: ApplicationListener;
  // readonly HttpsListener: ApplicationListener;

  constructor(galaxy: Galaxy, name: string, props?: EcsSolarSystemProps) {
    super(galaxy, name, props);

    const { vpc, vpcProps = {}, clusterProps = {}, clusterCapacityProps = {} } = props || {};
    const { defaultEndpoints = true } = vpcProps;

    // Add endpoints if created Vpc.
    if (!vpc) {
      if (defaultEndpoints) {
        this.Vpc.addInterfaceEndpoint('EcsEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECS,
        });
        this.Vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECS_AGENT,
        });
        this.Vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
        });
        this.Vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        });
        this.Vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
          service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        });
      }
    }

    this.Cluster = new Cluster(this, 'Cluster', {
      vpc: this.Vpc,
      ...clusterProps,
      clusterName: this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster'),
    });

    const capacity = this.Cluster.addCapacity('Capacity', {
      instanceType: new InstanceType('t2.medium'),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 5,
      ...clusterCapacityProps,
    });
    capacity.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));

    const AlbSecurityGroup = new SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.Vpc,
      description: 'SecurityGroup for SolarSystem ALB',
      allowAllOutbound: true,
    });

    this.Alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpc: this.Vpc,
      loadBalancerName: this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb'),
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

    RemoteCluster.export(this.Cluster, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster'));
    RemoteAlb.export(this.Alb, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb'));
    RemoteApplicationListener.export(this.HttpListener, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener'));
  }
}

export class ImportedEcsSolarSystem extends ImportedSolarSystem implements EcsSolarSystem {
  readonly Cluster: ICluster;
  readonly Alb: IApplicationLoadBalancer;
  readonly HttpListener: IApplicationListener;
  // readonly HttpsListener: IApplicationListener;

  constructor(scope: Construct, galaxy: Galaxy, name: string) {
    super(scope, galaxy, name);

    this.Cluster = RemoteCluster.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster'), this.Vpc);
    this.Alb = RemoteAlb.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb'));
    this.HttpListener = RemoteApplicationListener.import(
      this,
      this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener')
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
