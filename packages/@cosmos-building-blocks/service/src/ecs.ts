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
import { LogGroup } from '@aws-cdk/aws-logs';
import { EnableScalingProps } from '@aws-cdk/aws-applicationautoscaling';
import { getRoutingPriority } from './utils';

export interface EcsServiceProps {
  vpc: IVpc;
  cluster: ICluster;
  httpListener: IApplicationListener;
  containerProps: ContainerDefinitionOptions & { port?: PortMapping };
  serviceProps?: Partial<Ec2ServiceProps>;
  targetGroupProps?: Partial<ApplicationTargetGroupProps>;
  routingProps?: Partial<ApplicationListenerRuleProps>;
  scalingProps?: EnableScalingProps;
}

export class EcsService extends Construct {
  readonly LogGroup: LogGroup;
  readonly TaskDefinition: Ec2TaskDefinition;
  readonly Container: ContainerDefinition;
  readonly Service: Ec2Service;
  readonly TargetGroup: ApplicationTargetGroup;
  readonly ListenerRule: ApplicationListenerRule;
  readonly Scaling?: ScalableTaskCount;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

    const {
      vpc,
      cluster,
      httpListener,
      containerProps,
      serviceProps = {},
      targetGroupProps = {},
      routingProps,
      scalingProps,
    } = props;

    this.LogGroup = new LogGroup(this, 'Logs', {
      // logGroupName: `${id}-Logs`.replace('-', '/'),
    });

    this.TaskDefinition = new Ec2TaskDefinition(this, 'Task', {
      // family: `${id}-Task`,
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
      // serviceName: `${id}-Service`,
      taskDefinition: this.TaskDefinition,
      cluster: cluster,
    });

    // const targetGroupName = `${id}-TG`;
    this.TargetGroup = new ApplicationTargetGroup(this, 'ServiceTargetGroup', {
      ...targetGroupProps,
      vpc: vpc,
      // targetGroupName: targetGroupName.length <= 32 ? targetGroupName : undefined,
      protocol: ApplicationProtocol.HTTP,
      targets: [
        this.Service.loadBalancerTarget({
          containerName: 'Container',
        }),
      ],
      deregistrationDelay: Duration.seconds(0),
    });

    if (routingProps) {
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
    this.Scaling.scaleOnRequestCount('RequestScaling', {
      ...props,
      requestsPerTarget: 500,
      targetGroup: this.TargetGroup,
    });
  }
}
