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
import { Certificate, CertificateValidation } from '@aws-cdk/aws-certificatemanager';
import { getRoutingPriorityFromListenerProps } from '.';

type MutableListenerCondition = ListenerCondition & { values: string[] };

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
    subdomains?: string[];
    certificate?: boolean;
    dns?: boolean;
  };
  scalingProps?: EnableScalingProps;
}

export class EcsService extends Construct {
  readonly logGroup: LogGroup;
  readonly taskDefinition: Ec2TaskDefinition;
  readonly container: ContainerDefinition;
  readonly service: Ec2Service;
  readonly targetGroup?: ApplicationTargetGroup;
  readonly listenerConditions: ListenerCondition[];
  readonly listenerRules: ApplicationListenerRule[];
  readonly scaling?: ScalableTaskCount;
  readonly certificate?: Certificate;
  readonly subdomains: ARecord[];

  constructor(scope: Construct, id: string, props: EcsServiceProps) {
    super(scope, id);

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
    } = props;

    this.listenerRules = [];
    this.subdomains = [];

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
      circuitBreaker: { rollback: true },
      ...serviceProps,
      taskDefinition: this.taskDefinition,
      cluster: cluster,
    });

    if (routingProps) {
      const { httpsRedirect, subdomains, certificate, dns } = routingProps;

      const _routingProps = {
        priority: 0,
        conditions: [],
        ...routingProps,
      };
      this.listenerConditions = _routingProps.conditions;

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

      if (subdomains?.length) {
        if (!zone) throw new Error('Please provide zone prop.');

        let hostHeaderCondition: MutableListenerCondition | undefined = this.listenerConditions.find(
          (x) => x.renderRawCondition().field === 'host-header'
        ) as MutableListenerCondition;
        if (!hostHeaderCondition) {
          hostHeaderCondition = ListenerCondition.hostHeaders([]) as MutableListenerCondition;
          this.listenerConditions.push(hostHeaderCondition);
        }
        hostHeaderCondition.values.push(...subdomains.map((x) => `${x}.${zone.zoneName}`));

        if (dns) {
          if (!alb) throw new Error('Please provide alb prop.');

          subdomains.forEach((subdomain, i) => {
            const record = new ARecord(this, `Subdomain${i}`, {
              zone: zone,
              recordName: subdomain,
              target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
            });
            this.subdomains.push(record);
          });
        }

        if (certificate) {
          if (!alb) throw new Error('Please provide alb prop.');
          if (!httpsListener) throw new Error('Please provide httpsListener prop.');

          this.certificate = new Certificate(this, 'Certificate', {
            domainName: zone.zoneName,
            validation: CertificateValidation.fromDns(zone),
            subjectAlternativeNames: subdomains.map((x) => `${x}.${zone.zoneName}`),
          });
          this.certificate.node.addDependency(...this.subdomains);
          httpsListener.addCertificateArns(this.certificate.node.id, [this.certificate.certificateArn]);
        }
      }

      // Render the priority
      if (!_routingProps.priority) _routingProps.priority = getRoutingPriorityFromListenerProps(this, _routingProps);

      if (httpsListener) {
        this.listenerRules.push(
          new ApplicationListenerRule(this, `HttpsServiceRule`, {
            ..._routingProps,
            listener: httpsListener,
            action: ListenerAction.forward([this.targetGroup]),
          })
        );
      }

      if (httpsRedirect) {
        if (!httpListener) throw new Error('To enable https redirect you must provide an httpListener');

        new ApplicationListenerRule(this, 'HttpsRedirect', {
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
            ..._routingProps,
            listener: httpListener,
            action: ListenerAction.forward([this.targetGroup]),
          })
        );
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
