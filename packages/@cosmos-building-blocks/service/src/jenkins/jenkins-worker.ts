import { Construct } from '@aws-cdk/core';
import { DockerImageAsset, DockerImageAssetProps } from '@aws-cdk/aws-ecr-assets';
import { Role, ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { IVpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import { ICluster, Ec2TaskDefinition, ContainerImage, AwsLogDriver, NetworkMode } from '@aws-cdk/aws-ecs';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';

export interface JenkinsWorkerProps {
  vpc: IVpc;
  cluster: ICluster;
  envs?: Record<string, string>;
  dockerImageAssetProps?: DockerImageAssetProps;
}

export class JenkinsWorker extends Construct {
  /* assume developer knows what they are doing. Not going to make the properties readonly */
  readonly jenkinsWorkerImage: DockerImageAsset;

  taskDef: Ec2TaskDefinition;

  securityGroup: SecurityGroup;

  cluster: ICluster;

  constructor(scope: Construct, id: string, props: JenkinsWorkerProps) {
    super(scope, id);
    const { vpc, cluster, dockerImageAssetProps, envs } = props;
    // Building a custom image for jenkins agent (might need more than one custom image for future)
    this.jenkinsWorkerImage = new DockerImageAsset(this, 'DockerImage', {
      directory: `${__dirname}/docker/worker/`,
      ...dockerImageAssetProps,
    });

    this.securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
    });
    this.cluster = cluster;

    // IAM execution role for the workers to pull from ECR and push to CloudWatch logs
    const executionRole = new Role(this, 'ExecutionRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')],
    });

    // Task role for worker containers - add to this role for any aws resources that jenkins requires access to
    const taskRole = new Role(this, 'TaskRole', {
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Create log group for workers to log
    const logGroup = new LogGroup(this, 'Logs', {
      retention: RetentionDays.ONE_MONTH,
    });
    this.taskDef = new Ec2TaskDefinition(this, 'TaskDefinition', {
      executionRole,
      taskRole,
      // bridge networkMode doesn't need subnets and security Groups setting
      networkMode: NetworkMode.BRIDGE,
    });
    this.taskDef.addContainer('Agent', {
      image: ContainerImage.fromDockerImageAsset(this.jenkinsWorkerImage),
      cpu: 1024,
      // Soft memory limit
      memoryReservationMiB: 1024,
      privileged: true,
      logging: AwsLogDriver.awsLogs({ logGroup, streamPrefix: 'Agent' }),
      environment: {
        ...envs,
      },
    });
  }
}
