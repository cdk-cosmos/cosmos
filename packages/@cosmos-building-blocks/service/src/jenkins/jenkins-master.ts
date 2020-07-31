import { Construct, Duration } from '@aws-cdk/core';
import { DockerImageAsset, DockerImageAssetProps } from '@aws-cdk/aws-ecr-assets';
import {
  Ec2TaskDefinition,
  Ec2Service,
  Ec2ServiceProps,
  ICluster,
  LogDrivers,
  ContainerDefinition,
  ScalableTaskCount,
  PlacementStrategy,
  BuiltInAttributes,
  ContainerImage,
  CloudMapOptions,
  NetworkMode,
  CfnService,
} from '@aws-cdk/aws-ecs';
import { DnsRecordType, PrivateDnsNamespace } from '@aws-cdk/aws-servicediscovery';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { FileSystem } from '@aws-cdk/aws-efs';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources';
import {
  ApplicationTargetGroup,
  ApplicationProtocol,
  ApplicationListenerRule,
  IApplicationListener,
  ApplicationListenerRuleProps,
  ApplicationTargetGroupProps,
  TargetType,
  IApplicationLoadBalancer,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { Port, SecurityGroup, IVpc } from '@aws-cdk/aws-ec2';
import { LogGroup, RetentionDays, LogGroupProps } from '@aws-cdk/aws-logs';
import { EnableScalingProps } from '@aws-cdk/aws-applicationautoscaling';
import { BackupPlan, BackupResource } from '@aws-cdk/aws-backup';
import { IPublicHostedZone, RecordTarget, ARecord } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import { EfsAccessPoints } from './helper/efs-access-points';
import { getRoutingPriority } from '../utils';
import { JenkinsWorker } from './jenkins-worker';

interface MountPoint {
  containerPath: string;
  sourceVolume: string;
}

interface Volume {
  name: string;
  efsVolumeConfiguration?: {
    fileSystemId: string;
    authorizationConfig?: {
      iam: string;
      accessPointId: string;
    };
    transitEncryption: string;
  };
}

interface HostbasedRouting {
  alb: IApplicationLoadBalancer;
  zone: IPublicHostedZone;
  recordName: string;
}

export interface JenkinsMasterProps {
  vpc: IVpc;
  cluster: ICluster;
  worker: JenkinsWorker;
  listener?: IApplicationListener;
  serviceProps?: Partial<Ec2ServiceProps>;
  targetGroupProps?: Partial<ApplicationTargetGroupProps>;
  routingProps?: Partial<ApplicationListenerRuleProps>;
  scalingProps?: EnableScalingProps;
  logProps?: Partial<LogGroupProps>;
  namespace?: PrivateDnsNamespace;
  efs?: FileSystem;
  backupPlan?: boolean | BackupPlan;
  dockerImageAssetProps?: DockerImageAssetProps;
  hostBasedRouting?: HostbasedRouting;
}

export class JenkinsMaster extends Construct {
  /* assume developer knows what they are doing. Not going to make the properties readonly */
  jenkinsMasterImage: DockerImageAsset;

  readonly logGroup: LogGroup;

  taskDefinition: Ec2TaskDefinition;

  containerDefinition: ContainerDefinition;

  ec2Service: Ec2Service;

  targetGroup?: ApplicationTargetGroup;

  readonly ListenerRule?: ApplicationListenerRule;

  readonly Scaling?: ScalableTaskCount;

  readonly namespace?: PrivateDnsNamespace;

  readonly efs?: FileSystem;

  backupPlan?: BackupPlan;

  constructor(scope: Construct, id: string, props: JenkinsMasterProps) {
    super(scope, id);
    const {
      vpc,
      backupPlan = false,
      cluster,
      serviceProps,
      listener,
      targetGroupProps,
      routingProps,
      scalingProps,
      logProps,
      worker,
      namespace,
      efs,
      dockerImageAssetProps,
      hostBasedRouting,
    } = props;

    this.namespace = namespace;
    this.efs = efs;

    const jenkinsName = 'jenkins-master';

    /* Building a custom image for jenkins master */
    this.jenkinsMasterImage = new DockerImageAsset(this, 'DockerImage', {
      directory: `${__dirname}/docker/master/`,
      ...dockerImageAssetProps,
    });

    /* Create efs filesystem */
    if (!this.efs) {
      const efsSecurityGroup = new SecurityGroup(this, 'EfsSecurityGroup', {
        vpc,
      });

      this.efs = new FileSystem(this, 'Efs', {
        // todo: move to core
        encrypted: true,
        securityGroup: efsSecurityGroup,
        vpc,
      });
      if (backupPlan === true) {
        this.backupPlan = BackupPlan.dailyWeeklyMonthly5YearRetention(this, `JenkinsPlan`);
        this.backupPlan.addSelection('Selection', {
          resources: [
            BackupResource.fromEfsFileSystem(this.efs), // All backupable resources in `myCoolConstruct`
          ],
        });
      } else if (backupPlan instanceof BackupPlan) {
        this.backupPlan = backupPlan;
      }
    }

    const efsAccessPoints = new EfsAccessPoints(this.efs);

    const mountPoints: MountPoint[] = [];
    const volumes: Volume[] = [];

    efsAccessPoints.forEach((ap: AwsCustomResource, name: string) => {
      const containerPath = ap.getResponseField('RootDirectory.Path');
      mountPoints.push({ containerPath, sourceVolume: name });
      volumes.push({
        name,
        efsVolumeConfiguration: {
          fileSystemId: this.efs!.fileSystemId, // eslint-disable-line 
          authorizationConfig: {
            iam: 'ENABLED',
            accessPointId: ap.getResponseField('AccessPointId'),
          },
          transitEncryption: 'ENABLED',
        },
      });
    });

    /* Create namespace */
    if (!this.namespace) {
      this.namespace = new PrivateDnsNamespace(vpc.stack, 'Namespace', {
        name: 'servicediscovery.internal',
        vpc,
      });
    }

    /* Create ec2service */
    this.logGroup = new LogGroup(this, 'Logs', {
      retention: RetentionDays.ONE_MONTH,
      ...logProps,
    });
    this.taskDefinition = new Ec2TaskDefinition(this, 'Task', {
      networkMode: NetworkMode.AWS_VPC,
    }); // create task definition. it will be override later
    this.containerDefinition = this.taskDefinition.addContainer('JenkinsMaster', {
      // create container definition. it will be override later
      memoryLimitMiB: 256,
      image: ContainerImage.fromEcrRepository(this.jenkinsMasterImage.repository),
      logging: LogDrivers.awsLogs({
        logGroup: this.logGroup,
        streamPrefix: `JenkinsMaster`,
      }),
    });
    this.containerDefinition.addPortMappings({
      containerPort: 8080,
    });
    /*
      This JSON structure represents the final desired task definition, which includes the
      EFS volume configurations. This is a stop-gap measure that will be replaced when this
      capability is fully supported in CloudFormation and CDK.
    */
    const customTaskDefinitionJson = {
      containerDefinitions: [
        {
          essential: true,
          image: this.jenkinsMasterImage.imageUri,
          environment: [
            {
              name: 'cluster_arn',
              value: cluster.clusterArn,
            },
            {
              name: 'aws_region',
              value: vpc.stack.region,
            },
            {
              name: 'jenkins_url',
              value: `http://${jenkinsName}.${this.namespace.namespaceName}:8080`,
            },
            {
              name: 'agent_task_def_arn',
              value: worker.taskDef.taskDefinitionArn,
            },
            {
              name: 'agent_security_group_ids',
              value: worker.securityGroup.securityGroupId,
            },
            // https://github.com/jenkinsci/configuration-as-code-plugin/blob/master/README.md#getting-started
            {
              name: 'CASC_JENKINS_CONFIG',
              value: '/config-as-code.yaml',
            },
            // https://github.com/jenkinsci/docker/blob/master/README.md#passing-jvm-parameters
            {
              name: 'JAVA_OPTS',
              value: '-Xmx512m -Duser.timezone=Australia/Melbourne -Djenkins.install.runSetupWizard=false',
            },
            {
              name: 'JENKINS_HOME',
              value: '/data/shared/jenkins',
            },
          ],
          logConfiguration: {
            logDriver: this.taskDefinition.defaultContainer?.logDriverConfig?.logDriver,
            options: this.taskDefinition.defaultContainer?.logDriverConfig?.options,
          },
          cpu: 512,
          memory: 1024,
          mountPoints,
          name: 'JenkinsMaster',
          portMappings: [
            {
              hostPort: 8080,
              containerPort: 8080,
              protocol: 'tcp',
            },
            // Opening port 50000 for master <--> worker communications
            {
              hostPort: 50000,
              containerPort: 50000,
              protocol: 'tcp',
            },
          ],
        },
      ],
      executionRoleArn: this.taskDefinition.executionRole?.roleArn,
      family: this.taskDefinition.family,
      networkMode: NetworkMode.AWS_VPC, // use aws_vpc network mode as we need a fix host port for jenkins agent to communcate to.
      requiresCompatibilities: ['EC2'],
      taskRoleArn: this.taskDefinition.taskRole.roleArn,
      volumes,
    };

    this.ec2Service = new Ec2Service(this, 'Service', {
      desiredCount: 1,
      cloudMapOptions: {
        cloudMapNamespace: this.namespace,
        name: 'jenkins-master',
        dnsRecordType: DnsRecordType.A,
      } as CloudMapOptions,
      placementStrategies: [PlacementStrategy.spreadAcross(BuiltInAttributes.AVAILABILITY_ZONE)],
      ...serviceProps,
      taskDefinition: this.taskDefinition,
      cluster,
    });

    this.efs.connections.securityGroups[0].connections.allowFrom(this.ec2Service, Port.tcp(2049)); // allow ecs to access efs file system

    /*
      We use `AwsCustomResource` to create a new task definition revision with EFS volume
      configurations, which is available in the AWS SDK.
    */
    const createOrUpdateCustomTaskDefinition = {
      action: 'registerTaskDefinition',
      outputPath: 'taskDefinition.taskDefinitionArn',
      parameters: customTaskDefinitionJson,
      physicalResourceId: PhysicalResourceId.fromResponse('taskDefinition.taskDefinitionArn'),
      service: 'ECS',
    };
    const customTaskDefinition = new AwsCustomResource(this, 'CustomEC2TaskDefinition', {
      onCreate: createOrUpdateCustomTaskDefinition,
      onUpdate: createOrUpdateCustomTaskDefinition,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    this.taskDefinition.executionRole?.grantPassRole(customTaskDefinition.grantPrincipal);
    this.taskDefinition.taskRole.grantPassRole(customTaskDefinition.grantPrincipal);

    /*
      Finally, we'll update the ECS service to use the new task definition revision
      that we just created above.
    */
    (this.ec2Service.node.tryFindChild('Service') as CfnService)?.addPropertyOverride(
      'TaskDefinition',
      customTaskDefinition.getResponseField('taskDefinition.taskDefinitionArn')
    );

    /* setup route for alb */
    const target = this.ec2Service.loadBalancerTarget({
      containerName: 'JenkinsMaster',
    });
    if (routingProps) {
      if (!listener) throw new Error('To enable routing, Http Listener is required');

      this.targetGroup = new ApplicationTargetGroup(this, 'ServiceTargetGroup', {
        protocol: ApplicationProtocol.HTTP,
        targetType: TargetType.IP,
        deregistrationDelay: Duration.seconds(0),
        ...targetGroupProps,
        vpc,
        targets: [target],
      });

      this.ListenerRule = new ApplicationListenerRule(this, 'ServiceRule', {
        priority: getRoutingPriority(routingProps),
        ...routingProps,
        listener,
        targetGroups: [this.targetGroup],
      });
      if (hostBasedRouting) {
        // create dns record for jenkins master
        new ARecord(this, 'Alias', {
          zone: hostBasedRouting.zone,
          recordName: hostBasedRouting.recordName,
          target: RecordTarget.fromAlias(new LoadBalancerTarget(hostBasedRouting.alb)),
        });
      }
    }

    /* service autoscaling */
    if (scalingProps) {
      this.Scaling = this.ec2Service.autoScaleTaskCount(scalingProps);
    }

    /* enable security group connection */
    this.ec2Service.connections.allowFrom(worker.cluster.connections, Port.tcp(50000)); // Enable connection between Master and Worker on 50000
    this.ec2Service.connections.allowFrom(worker.cluster.connections, Port.tcp(8080)); // Enable connection between Master and Worker on 8080
    this.ec2Service.connections.allowFrom(listener!, Port.tcp(8080)); // eslint-disable-line

    /* IAM Statements to allow jenkins ecs plugin to talk to ECS as well as the Jenkins cluster */
    this.ec2Service.taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: [
          'ecs:RegisterTaskDefinition',
          'ecs:DeregisterTaskDefinition',
          'ecs:ListClusters',
          'ecs:DescribeContainerInstances',
          'ecs:ListTaskDefinitions',
          'ecs:DescribeTaskDefinition',
          'ecs:DescribeTasks',
        ],
        resources: ['*'],
      })
    );

    this.ec2Service.taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: ['ecs:ListContainerInstances'],
        resources: [cluster.clusterArn],
      })
    );

    this.ec2Service.taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [worker.taskDef.taskDefinitionArn],
      })
    );

    this.ec2Service.taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: ['ecs:StopTask'],
        resources: [`arn:aws:ecs:${vpc.stack.region}:${vpc.stack.account}:task/*`],
        conditions: {
          'ForAnyValue:ArnEquals': {
            'ecs:cluster': cluster.clusterArn,
          },
        },
      })
    );

    this.ec2Service.taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [worker.taskDef.executionRole?.roleArn || '', worker.taskDef.taskRole.roleArn],
      })
    );
  }
}
