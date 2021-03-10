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
  ILoadBalancerV2,
  ListenerCondition,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { IVpc } from '@aws-cdk/aws-ec2';
import { LogGroup, LogGroupProps, RetentionDays } from '@aws-cdk/aws-logs';
import { EnableScalingProps } from '@aws-cdk/aws-applicationautoscaling';
import { ARecord, IHostedZone, RecordTarget } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import { Certificate, DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { getRoutingPriorityFromListenerProps } from '../utils';

export interface EcsServiceProps {
  vpc: IVpc;
  zone?: IHostedZone;
  cluster: ICluster;
  alb?: ILoadBalancerV2;
  httpListener?: IApplicationListener;
  httpsListener?: IApplicationListener;
  logProps?: Partial<LogGroupProps>;
  taskProps?: Partial<Ec2TaskDefinitionProps>;
  containerProps: ContainerDefinitionOptions & { port?: PortMapping };
  serviceProps?: Partial<Ec2ServiceProps>;
  targetGroupProps?: Partial<ApplicationTargetGroupProps>;
  routingProps?: Partial<ApplicationListenerRuleProps> & {
    httpsRedirect?: boolean;
    certificate?: boolean;
    subDomains?: string[];
  };
  scalingProps?: EnableScalingProps;
}

export class EcsService extends Construct {
  readonly logGroup: LogGroup;
  readonly taskDefinition: Ec2TaskDefinition;
  readonly container: ContainerDefinition;
  readonly service: Ec2Service;
  readonly targetGroup?: ApplicationTargetGroup;
  readonly listenerRules: ApplicationListenerRule[];
  readonly scaling?: ScalableTaskCount;
  readonly certificate?: Certificate;
  readonly subDomains: ARecord[];
  private props: EcsServiceProps;

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

    this.props = props;

    const {
      vpc,
      zone,
      cluster,
      alb,
      httpListener,
      httpsListener,
      logProps,
      taskProps,
      containerProps,
      serviceProps,
      targetGroupProps,
      routingProps,
      scalingProps,
    } = this.props;

    this.listenerRules = [];
    this.subDomains = [];

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
      const { httpsRedirect, subDomains, certificate } = routingProps;
      if (!httpListener && !httpsListener) throw new Error('To enable routing, an Http Listener is required');

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

      const conditions = [...(routingProps.conditions || [])];

      const _routingProps = {
        ...routingProps,
        conditions: conditions,
      };

      if (subDomains) {
        if (!zone) throw new Error('Please provide zone prop.');
        if (!alb) throw new Error('Please provide alb prop.');

        subDomains.forEach((subdomain, i) => {
          const record = new ARecord(this, `Subdomain${i}`, {
            zone: zone,
            recordName: subdomain,
            target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
          });
          this.subDomains.push(record);
        });

        conditions.push(ListenerCondition.hostHeaders(subDomains.map((x) => `${x}.${zone.zoneName}`)));
      }

      if (httpsListener) {
        this.listenerRules.push(
          new ApplicationListenerRule(this, `HttpsServiceRule`, {
            priority: getRoutingPriorityFromListenerProps(_routingProps),
            ..._routingProps,
            listener: httpsListener,
            action: ListenerAction.forward([this.targetGroup]),
          })
        );
      }

      if (httpsRedirect) {
        if (!httpListener) throw new Error('To enable https redirect you must provide an httpListener');

        new ApplicationListenerRule(this, 'HttpsRedirect', {
          priority: getRoutingPriorityFromListenerProps(_routingProps),
          ..._routingProps,
          listener: httpListener,
          action: ListenerAction.redirect({
            permanent: true,
            protocol: 'HTTPS',
            port: '443',
          }),
        });
      } else if (httpListener) {
        this.listenerRules.push(
          new ApplicationListenerRule(this, `HttpServiceRule`, {
            priority: getRoutingPriorityFromListenerProps(_routingProps),
            ..._routingProps,
            listener: httpListener,
            action: ListenerAction.forward([this.targetGroup]),
          })
        );
      }

      if (certificate) {
        if (!zone) throw new Error('Please provide zone prop.');
        if (!alb) throw new Error('Please provide alb prop.');
        if (!httpsListener) throw new Error('Please provide httpsListener prop.');

        this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
          hostedZone: zone,
          domainName: zone.zoneName,
          subjectAlternativeNames: subDomains?.length ? subDomains.map((x) => `${x}.${zone.zoneName}`) : undefined,
        });

        httpsListener.addCertificateArns(this.certificate.node.id, [this.certificate.certificateArn]);
      }
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
