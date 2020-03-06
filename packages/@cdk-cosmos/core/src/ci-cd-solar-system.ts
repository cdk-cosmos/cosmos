import { Stack, StackProps, Construct } from '@aws-cdk/core';
import { Vpc, SubnetType, InstanceType, IVpc } from '@aws-cdk/aws-ec2';
import { HostedZone, ZoneDelegationRecord, IHostedZone } from '@aws-cdk/aws-route53';
import { Cluster, ICluster } from '@aws-cdk/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ApplicationTargetGroup,
  ApplicationProtocol,
  TargetType,
  IApplicationLoadBalancer,
  IApplicationListener,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { Project } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import {
  Galaxy,
  EcsSolarSystem,
  CiCdSolarSystem,
  GalaxyExtension,
  CiCdSolarSystemExtension,
  RemoteVpc,
  RemoteZone,
  RemoteCluster,
  RemoteAlb,
  RemoteApplicationListener,
  CdkPipeline,
} from '.';

export interface CiCdStackProps extends StackProps {
  cidr: string;
}

export class CiCdSolarSystemStack extends Stack implements CiCdSolarSystem {
  readonly Type = 'SolarSystem';
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly Vpc: Vpc;
  readonly Zone: HostedZone;
  readonly Cluster: Cluster;
  readonly Alb: ApplicationLoadBalancer;
  readonly HttpListener: ApplicationListener;
  readonly CdkDeploy: Project;

  constructor(galaxy: Galaxy, props: CiCdStackProps) {
    super(galaxy.Cosmos.Scope, `Cosmos-Core-Galaxy-${galaxy.Name}-SolarSystem-CiCd`, {
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    const { cidr } = props;

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = 'CiCd';

    this.Vpc = new Vpc(this, 'Vpc', {
      cidr: cidr,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'Main',
          subnetType: SubnetType.ISOLATED,
          cidrMask: 26,
        },
      ],
    });

    const rootZoneName = this.Galaxy.Cosmos.RootZone.zoneName;
    this.Zone = new HostedZone(this, 'Zone', {
      zoneName: `${this.Name}.${rootZoneName}`.toLowerCase(),
    });
    new ZoneDelegationRecord(this, 'ZoneDelegation', {
      zone: this.Galaxy.Cosmos.RootZone,
      recordName: this.Zone.zoneName,
      nameServers: this.Zone.hostedZoneNameServers as string[],
    });

    this.Cluster = new Cluster(this, 'Cluster', {
      vpc: this.Vpc,
      clusterName: `Core-${this.Galaxy.Name}-${this.Name}-Cluster`,
    });

    this.Cluster.addCapacity('Capacity', {
      instanceType: new InstanceType('t2.medium'),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 5,
    });

    this.Alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpc: this.Vpc,
    });
    this.HttpListener = this.Alb.addListener('HttpListener', {
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [
        new ApplicationTargetGroup(this, 'DefaultTargetGroup', {
          vpc: this.Vpc,
          protocol: ApplicationProtocol.HTTP,
          targetType: TargetType.INSTANCE,
        }),
      ],
    });

    const { CdkRepo, CdkMasterRoleStaticArn } = this.Galaxy.Cosmos;
    const pipeline = new CdkPipeline(this, 'CdkPipeline', {
      name: 'Core-Cdk-Pipeline',
      cdkRepo: CdkRepo,
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', CdkMasterRoleStaticArn, { mutable: false }),
      // deployVpc: this.Vpc,
      deployStacks: [`Cosmos-Core-*`],
    });
    this.CdkDeploy = pipeline.Deploy;

    RemoteVpc.export(`Core${this.Galaxy.Name}${this.Name}`, this.Vpc);
    RemoteZone.export(`Core${this.Galaxy.Name}${this.Name}`, this.Zone);
    RemoteCluster.export(`Core${this.Galaxy.Name}${this.Name}`, this.Cluster);
    RemoteAlb.export(`Core${this.Galaxy.Name}${this.Name}`, this.Alb);
    RemoteApplicationListener.export(`Core${this.Galaxy.Name}${this.Name}`, this.HttpListener);
    // RemoteBuildProject.export(`Core${this.Account.Name}${this.Name}`, this.CdkDeploy);
  }
}

export class ImportedCiCdSolarSystem extends Construct implements CiCdSolarSystem {
  readonly Type = 'SolarSystem';
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly Vpc: IVpc;
  readonly Zone: IHostedZone;
  readonly Cluster: ICluster;
  readonly Alb: IApplicationLoadBalancer;
  readonly HttpListener: IApplicationListener;
  // readonly CdkDeploy: IProject;

  constructor(scope: Construct, galaxy: Galaxy) {
    super(scope, `Cosmos-Core-Galaxy-${galaxy.Name}-SolarSystem-CiCd`);

    this.Galaxy = galaxy;
    this.Name = 'CiCd';

    this.Vpc = RemoteVpc.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'Vpc', { hasIsolated: true });
    this.Zone = RemoteZone.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'Zone');
    this.Cluster = RemoteCluster.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'Cluster', this.Vpc);
    this.Alb = RemoteAlb.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'Alb');
    this.HttpListener = RemoteApplicationListener.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'HttpListener');
    // this.CdkDeploy = RemoteBuildProject.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'CdkPipelineDeploy');
  }
}

export class CiCdSolarSystemExtensionStack extends Stack implements CiCdSolarSystemExtension {
  readonly Type = 'SolarSystemExtension';
  readonly Galaxy: GalaxyExtension;
  readonly Name: string;
  readonly Portal: EcsSolarSystem;
  readonly DeployPipeline: CdkPipeline;
  readonly DeployProject: Project;

  constructor(galaxy: GalaxyExtension, props?: StackProps) {
    super(galaxy.Cosmos.Scope, `Cosmos-App-${galaxy.Cosmos.Name}-Galaxy-${galaxy.Name}-SolarSystem-CiCd`, {
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = 'CiCd';
    this.Portal = new ImportedCiCdSolarSystem(this, this.Galaxy.Portal);

    this.DeployPipeline = new CdkPipeline(this, 'CdkPipeline', {
      name: `App-${this.Galaxy.Cosmos.Name}-Cdk-Pipeline`,
      cdkRepo: this.Galaxy.Cosmos.CdkRepo,
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', this.Galaxy.Cosmos.Portal.CdkMasterRoleStaticArn, {
        mutable: false,
      }),
      deployStacks: [`Cosmos-App-${this.Galaxy.Cosmos.Name}-*`],
    });
    this.DeployProject = this.DeployPipeline.Deploy;
  }
}
