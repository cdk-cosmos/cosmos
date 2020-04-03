import { Construct } from '@aws-cdk/core';
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
} from '@aws-cdk/aws-ecs';
import {
  ApplicationTargetGroup,
  ApplicationProtocol,
  ApplicationListenerRule,
  IApplicationListener,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { LogGroup } from '@aws-cdk/aws-logs';

export interface EcsServiceProps {
  vpc: IVpc;
  cluster: ICluster;
  httpListener: IApplicationListener;
  container: ContainerDefinitionOptions & { port?: PortMapping };
  service: Partial<Ec2ServiceProps>;
  routing: {
    pathPattern: string;
    priority: number;
  };
}

export class EcsService extends Construct {
  readonly LogGroup: LogGroup;
  readonly TaskDefinition: Ec2TaskDefinition;
  readonly Container: ContainerDefinition;
  readonly Service: Ec2Service;
  readonly TargetGroup: ApplicationTargetGroup;
  readonly ListenerRule: ApplicationListenerRule;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

    const { vpc, cluster, httpListener, container, service, routing } = props;

    this.LogGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: `${id}-Logs`.replace('-', '/'),
    });

    this.TaskDefinition = new Ec2TaskDefinition(this, 'Task', {
      family: `${id}-Task`,
    });

    this.Container = this.TaskDefinition.addContainer('AppContainer', {
      memoryLimitMiB: 256,
      logging: LogDrivers.awsLogs({ logGroup: this.LogGroup, streamPrefix: `AppContainer` }),
      ...container,
    });

    this.Container.addPortMappings({
      containerPort: 80,
      protocol: Protocol.TCP,
      ...container.port,
    });

    this.Service = new Ec2Service(this, 'Service', {
      desiredCount: 1,
      ...service,
      serviceName: `${id}-Service`,
      taskDefinition: this.TaskDefinition,
      cluster: cluster,
    });

    const targetGroupName = `${id}-TG`;
    this.TargetGroup = new ApplicationTargetGroup(this, 'ServiceTargetGroup', {
      vpc: vpc,
      targetGroupName: targetGroupName.length <= 32 ? targetGroupName : undefined,
      protocol: ApplicationProtocol.HTTP,
      targets: [
        this.Service.loadBalancerTarget({
          containerName: 'AppContainer',
        }),
      ],
    });

    this.ListenerRule = new ApplicationListenerRule(this, 'ServiceRule', {
      ...routing,
      listener: httpListener,
      targetGroups: [this.TargetGroup],
    });
  }
}
