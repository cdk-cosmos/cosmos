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
  ListenerAction,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { LogGroup, LogGroupProps, RetentionDays } from '@aws-cdk/aws-logs';
import { EnableScalingProps } from '@aws-cdk/aws-applicationautoscaling';
import { getRoutingPriorityFromListenerProps } from '../utils';

export interface EcsServiceProps {
  vpc: IVpc;
  cluster: ICluster;
  httpListener?: IApplicationListener;
  logProps?: Partial<LogGroupProps>;
  taskProps?: Partial<Ec2TaskDefinitionProps>;
  containerProps: ContainerDefinitionOptions & { port?: PortMapping };
  serviceProps?: Partial<Ec2ServiceProps>;
  targetGroupProps?: Partial<ApplicationTargetGroupProps>;
  routingProps?: Partial<ApplicationListenerRuleProps>;
  scalingProps?: EnableScalingProps;
}

export class EcsService extends Construct {
  readonly logGroup: LogGroup;
  readonly taskDefinition: Ec2TaskDefinition;
  readonly container: ContainerDefinition;
  readonly service: Ec2Service;
  readonly targetGroup?: ApplicationTargetGroup;
  readonly listenerRule?: ApplicationListenerRule;
  readonly scaling?: ScalableTaskCount;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

    const {
      vpc,
      cluster,
      httpListener,
      logProps,
      taskProps,
      containerProps,
      serviceProps,
      targetGroupProps,
      routingProps,
      scalingProps,
    } = props;

    this.logGroup = new LogGroup(this, 'Logs', {
      retention: RetentionDays.ONE_MONTH,
      ...logProps,
    });

    this.taskDefinition = new Ec2TaskDefinition(this, 'Task', {
      ...taskProps,
    });

    this.container = this.taskDefinition.addContainer('Container', {
      memoryReservationMiB: 256,
      logging: LogDrivers.awsLogs({ logGroup: this.logGroup, streamPrefix: `Container` }),
      ...containerProps,
    });

    this.container.addPortMappings({
      containerPort: 80,
      protocol: Protocol.TCP,
      ...containerProps.port,
    });

    this.service = new Ec2Service(this, 'Service', {
      desiredCount: 1,
      placementStrategies: [PlacementStrategy.spreadAcross(BuiltInAttributes.AVAILABILITY_ZONE)],
      ...serviceProps,
      taskDefinition: this.taskDefinition,
      cluster: cluster,
    });

    if (routingProps) {
      if (!httpListener) throw new Error('To enable routing, Http Listener is required');

      this.targetGroup = new ApplicationTargetGroup(this, 'ServiceTargetGroup', {
        protocol: ApplicationProtocol.HTTP,
        deregistrationDelay: Duration.seconds(0),
        healthCheck: {
          path: '/health',
        },
        ...targetGroupProps,
        vpc: vpc,
        targets: [
          this.service.loadBalancerTarget({
            containerName: 'Container',
          }),
        ],
      });

      this.listenerRule = new ApplicationListenerRule(this, 'ServiceRule', {
        priority: getRoutingPriorityFromListenerProps(routingProps),
        ...routingProps,
        listener: httpListener,
        action: ListenerAction.forward([this.targetGroup]),
      });
    }

    if (scalingProps) {
      this.scaling = this.service.autoScaleTaskCount(scalingProps);
    }
  }

  addCpuAutoScaling(props: Partial<CpuUtilizationScalingProps>): void {
    if (!this.scaling) throw new Error('Scaling needs to be enabled');
    this.scaling.scaleOnCpuUtilization('CpuScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
  }

  addMemoryAutoScaling(props: Partial<RequestCountScalingProps>): void {
    if (!this.scaling) throw new Error('Scaling needs to be enabled');
    this.scaling.scaleOnMemoryUtilization('MemoryScaling', {
      ...props,
      targetUtilizationPercent: 50,
    });
  }

  addRequestAutoScaling(props: Partial<RequestCountScalingProps>): void {
    if (!this.scaling) throw new Error('Scaling needs to be enabled');
    if (!this.targetGroup) throw new Error('Routing needs to be enabled');
    this.scaling.scaleOnRequestCount('RequestScaling', {
      ...props,
      requestsPerTarget: 500,
      targetGroup: this.targetGroup,
    });
  }
}
