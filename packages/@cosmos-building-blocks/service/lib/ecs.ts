import { Construct } from '@aws-cdk/core';
import {
  Ec2TaskDefinition,
  Ec2Service,
  Protocol,
  ContainerDefinitionOptions,
  PortMapping,
  Ec2ServiceProps,
  ICluster,
} from '@aws-cdk/aws-ecs';
import {
  ApplicationTargetGroup,
  ApplicationProtocol,
  ApplicationListenerRule,
  IApplicationListener,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';

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

// TODO: Split into Generic version and Consumer Version
export class EcsService extends Construct {
  readonly TaskDefinition: Ec2TaskDefinition;
  readonly Service: Ec2Service;
  readonly ApplicationTargetGroup: ApplicationTargetGroup;

  constructor(scope: Construct, namespace: string, id: string, props: EcsServiceProps) {
    super(scope, id);

    const { vpc, cluster, httpListener, container, service, routing } = props;

    this.TaskDefinition = new Ec2TaskDefinition(this, 'Task', {
      family: `App-${namespace}-${id}-Task`,
    });

    this.TaskDefinition.addContainer('AppContainer', {
      memoryLimitMiB: 256,
      ...container,
    }).addPortMappings({
      containerPort: 80,
      protocol: Protocol.TCP,
      ...container.port,
    });

    this.Service = new Ec2Service(this, 'Service', {
      desiredCount: 1,
      ...service,
      serviceName: `App-${namespace}-${id}-Service`,
      taskDefinition: this.TaskDefinition,
      cluster: cluster,
    });

    const targetGroupName = `${namespace}-${id}-TG`;
    const targetGroup = new ApplicationTargetGroup(this, 'ServiceTargetGroup', {
      vpc: vpc,
      targetGroupName: targetGroupName.length <= 32 ? targetGroupName : undefined, // TODO: Add warning for this case
      protocol: ApplicationProtocol.HTTP,
      targets: [
        this.Service.loadBalancerTarget({
          containerName: 'AppContainer',
        }),
      ],
    });

    new ApplicationListenerRule(this, 'ServiceRule', {
      ...routing,
      listener: httpListener,
      targetGroups: [targetGroup],
    });
  }
}
