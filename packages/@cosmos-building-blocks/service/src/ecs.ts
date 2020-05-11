import { Construct, Duration } from '@aws-cdk/core';
import {
  Ec2TaskDefinition,
  Ec2Service,
  Protocol,
  ContainerDefinitionOptions,
  PortMapping,
  Ec2ServiceProps,
  ICluster,
  LogDrivers,
  ContainerDefinition,
  ScalableTaskCount,
  CpuUtilizationScalingProps,
  RequestCountScalingProps,
  PlacementStrategy,
  BuiltInAttributes,
  Ec2TaskDefinitionProps,
} from '@aws-cdk/aws-ecs';
import {
  ApplicationTargetGroup,
  ApplicationProtocol,
  ApplicationListenerRule,
  IApplicationListener,
  ApplicationListenerRuleProps,
  ApplicationTargetGroupProps,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { LogGroup, LogGroupProps } from '@aws-cdk/aws-logs';
import { EnableScalingProps } from '@aws-cdk/aws-applicationautoscaling';
import { getRoutingPriority } from './utils';

export interface EcsServiceProps {
  vpc: IVpc;
  cluster: ICluster;
  containerProps: ContainerDefinitionOptions & { port?: PortMapping };
  httpListener?: IApplicationListener;
  taskProps?: Partial<Ec2TaskDefinitionProps>;
  serviceProps?: Partial<Ec2ServiceProps>;
  targetGroupProps?: Partial<ApplicationTargetGroupProps>;
  routingProps?: Partial<ApplicationListenerRuleProps>;
  scalingProps?: EnableScalingProps;
  logProps?: Partial<LogGroupProps>;
}

export class EcsService extends Construct {
  readonly LogGroup: LogGroup;
  readonly TaskDefinition: Ec2TaskDefinition;
  readonly Container: ContainerDefinition;
  readonly Service: Ec2Service;
  readonly TargetGroup?: ApplicationTargetGroup;
  readonly ListenerRule?: ApplicationListenerRule;
  readonly Scaling?: ScalableTaskCount;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

    const {
      vpc,
      cluster,
      httpListener,
      containerProps,
      taskProps,
      serviceProps,
      targetGroupProps,
      routingProps,
      scalingProps,
      logProps,
    } = props;

    this.LogGroup = new LogGroup(this, 'Logs', logProps);

    this.TaskDefinition = new Ec2TaskDefinition(this, 'Task', {
      ...taskProps,
    });

    this.Container = this.TaskDefinition.addContainer('Container', {
      memoryLimitMiB: 256,
      logging: LogDrivers.awsLogs({ logGroup: this.LogGroup, streamPrefix: `Container` }),
      ...containerProps,
    });

    this.Container.addPortMappings({
      containerPort: 80,
      protocol: Protocol.TCP,
      ...containerProps.port,
    });

    this.Service = new Ec2Service(this, 'Service', {
      desiredCount: 1,
      placementStrategies: [PlacementStrategy.spreadAcross(BuiltInAttributes.AVAILABILITY_ZONE)],
      ...serviceProps,
      taskDefinition: this.TaskDefinition,
      cluster: cluster,
    });

    if (routingProps) {
      if (!httpListener) throw new Error('To enable routing, Http Listener is required');

      this.TargetGroup = new ApplicationTargetGroup(this, 'ServiceTargetGroup', {
        protocol: ApplicationProtocol.HTTP,
        deregistrationDelay: Duration.seconds(0),
        ...targetGroupProps,
        vpc: vpc,
        targets: [
          this.Service.loadBalancerTarget({
            containerName: 'Container',
          }),
        ],
      });

      this.ListenerRule = new ApplicationListenerRule(this, 'ServiceRule', {
        priority: getRoutingPriority(routingProps),
        ...routingProps,
        listener: httpListener,
        targetGroups: [this.TargetGroup],
      });
    }

    if (scalingProps) {
      this.Scaling = this.Service.autoScaleTaskCount(scalingProps);
    }
  }

  addCpuAutoScaling(props: Partial<CpuUtilizationScalingProps>): void {
    if (!this.Scaling) throw new Error('Scaling needs to be enabled');
    this.Scaling.scaleOnCpuUtilization('CpuScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
  }

  addMemoryAutoScaling(props: Partial<RequestCountScalingProps>): void {
    if (!this.Scaling) throw new Error('Scaling needs to be enabled');
    this.Scaling.scaleOnMemoryUtilization('MemoryScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
  }

  addRequestAutoScaling(props: Partial<RequestCountScalingProps>): void {
    if (!this.Scaling) throw new Error('Scaling needs to be enabled');
    if (!this.TargetGroup) throw new Error('Routing needs to be enabled');
    this.Scaling.scaleOnRequestCount('RequestScaling', {
      ...props,
      requestsPerTarget: 500,
      targetGroup: this.TargetGroup,
    });
  }
}
