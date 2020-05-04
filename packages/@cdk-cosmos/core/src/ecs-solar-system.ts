import { Construct } from '@aws-cdk/core';
import { InstanceType, SecurityGroup, InterfaceVpcEndpointAwsService } from '@aws-cdk/aws-ec2';
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
  SolarSystemExtensionStackProps,
} from '.';
import { ImportedSolarSystemProps } from './solar-system';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EcsSolarSystemProps extends SolarSystemProps {
  vpcProps?: SolarSystemProps['vpcProps'] & {
    defaultEndpoints?: boolean;
  };
  clusterProps?: Partial<ClusterProps>;
  clusterCapacityProps?: Partial<AddCapacityOptions>;
  albProps?: Partial<ApplicationLoadBalancerProps>;
}

export class EcsSolarSystemStack extends SolarSystemStack implements EcsSolarSystem {
  readonly Cluster: Cluster;
  readonly ClusterAutoScalingGroup: AutoScalingGroup;
  readonly Alb: ApplicationLoadBalancer;
  readonly HttpListener: ApplicationListener;
  readonly HttpInternalListener: ApplicationListener;

  // readonly HttpsListener: ApplicationListener;

  constructor(galaxy: Galaxy, name: string, props?: EcsSolarSystemProps) {
    super(galaxy, name, props);

    const { vpc, vpcProps = {}, clusterProps = {}, clusterCapacityProps = {}, albProps = {} } = props || {};
    const { defaultEndpoints = true } = vpcProps;

    // Only add endpoints if this component created the Vpc. ie vpc was not passed in as a prop.
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

    this.ClusterAutoScalingGroup = this.Cluster.addCapacity('Capacity', {
      vpcSubnets: { subnetGroupName: 'App' },
      instanceType: new InstanceType('t3.medium'),
      minCapacity: 1,
      maxCapacity: 5,
      ...clusterCapacityProps,
    });

    this.ClusterAutoScalingGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));

    const albSecurityGroup =
      albProps.securityGroup ||
      new SecurityGroup(this, 'AlbSecurityGroup', {
        vpc: this.Vpc,
        description: 'SecurityGroup for ALB.',
        allowAllOutbound: true,
      });

    this.Alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpcSubnets: { subnetGroupName: 'App' },
      ...albProps,
      vpc: this.Vpc,
      securityGroup: albSecurityGroup,
      loadBalancerName: this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb'),
    });

    new ARecord(this, 'AlbRecord', {
      zone: this.Zone,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(this.Alb)),
    });

    this.HttpListener = this.Alb.addListener('HttpListener', {
      protocol: ApplicationProtocol.HTTP,
    });

    this.HttpInternalListener = this.Alb.addListener('HttpInternalListener', {
      protocol: ApplicationProtocol.HTTP,
      port: 81,
    });

    // TODO: ?
    // this.httpListener = this.alb.addListener("HttpsListener", {
    //   port: 443,
    //   open: true
    // });

    for (const listener of [this.HttpListener, this.HttpInternalListener]) {
      listener.addFixedResponse('Default', {
        statusCode: '404',
        contentType: ContentType.TEXT_PLAIN,
        messageBody: 'Route Not Found.',
      });
    }

    RemoteCluster.export(this.Cluster, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster'));
    RemoteAlb.export(this.Alb, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb'));
    RemoteApplicationListener.export(this.HttpListener, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener'));
    RemoteApplicationListener.export(
      this.HttpInternalListener,
      this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpInternalListener')
    );
  }

  addCpuAutoScaling(props: Partial<CpuUtilizationScalingProps>): void {
    this.ClusterAutoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
  }

  // TODO: addMemoryScaling when monitory and metrics task is done (custom metric needed ?)
}

export class ImportedEcsSolarSystem extends ImportedSolarSystem implements EcsSolarSystem {
  readonly Cluster: ICluster;
  readonly Alb: IApplicationLoadBalancer;
  readonly HttpListener: IApplicationListener;
  readonly HttpInternalListener: IApplicationListener;
  // readonly HttpsListener: IApplicationListener;

  constructor(scope: Construct, galaxy: Galaxy, props: ImportedSolarSystemProps) {
    super(scope, galaxy, props);

    this.Cluster = RemoteCluster.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster'), this.Vpc);
    this.Alb = RemoteAlb.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb'));
    this.HttpListener = RemoteApplicationListener.import(
      this,
      this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener')
    );
    this.HttpInternalListener = RemoteApplicationListener.import(
      this,
      this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpInternalListener')
    );
  }
}

export class EcsSolarSystemExtensionStack extends SolarSystemExtensionStack implements EcsSolarSystemExtension {
  readonly Portal: EcsSolarSystem;

  constructor(galaxy: GalaxyExtension, name: string, props?: SolarSystemExtensionStackProps) {
    super(galaxy, name, props);

    this.node.tryRemoveChild(this.Portal.node.id);
    this.Portal = new ImportedEcsSolarSystem(this, this.Galaxy.Portal, {
      name: this.Name,
      vpcProps: props?.vpcProps,
    });
  }
}
