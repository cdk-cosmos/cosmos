import { Stack, StackProps, Construct } from '@aws-cdk/core';
import { Vpc, SubnetType, InstanceType, IVpc } from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
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
  RESOLVE,
  PATTERN,
  Bubble,
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

const stackName = (galaxy: Bubble, name: string): string =>
  RESOLVE(PATTERN.SOLAR_SYSTEM, 'SolarSystem', { Name: name, Galaxy: galaxy });

export interface CiCdStackProps extends StackProps {
  cidr?: string;
}

export class CiCdSolarSystemStack extends Stack implements CiCdSolarSystem {
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly NetworkBuilder?: NetworkBuilder;
  readonly Vpc: Vpc;
  readonly Zone: HostedZone;
  readonly Cluster: Cluster;
  readonly Alb: ApplicationLoadBalancer;
  readonly HttpListener: ApplicationListener;
  readonly CdkDeploy: Project;

  constructor(galaxy: Galaxy, props?: CiCdStackProps) {
    super(galaxy.Cosmos.Scope, stackName(galaxy, 'CiCd'), {
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    const { cidr } = props || {};

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = 'CiCd';
    if (cidr) this.NetworkBuilder = new NetworkBuilder(cidr);
    else if (this.Galaxy.NetworkBuilder) this.NetworkBuilder = this.Galaxy.NetworkBuilder;

    if (!this.NetworkBuilder) {
      throw new Error(
        `NetworkBuilder not found, please define cidr range here or Galaxy or Cosmos. (System: ${this.Name}).`
      );
    }

    this.Vpc = new Vpc(this, 'Vpc', {
      cidr: this.NetworkBuilder.addSubnet(24),
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
    // TODO:
    new ZoneDelegationRecord(this, 'ZoneDelegation', {
      zone: this.Galaxy.Cosmos.RootZone,
      recordName: this.Zone.zoneName,
      nameServers: this.Zone.hostedZoneNameServers as string[],
    });

    this.Cluster = new Cluster(this, 'Cluster', {
      vpc: this.Vpc,
      clusterName: RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster', this),
    });

    this.Cluster.addCapacity('Capacity', {
      instanceType: new InstanceType('t2.medium'),
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 5,
    });

    this.Alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpc: this.Vpc,
      loadBalancerName: RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb', this),
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
      name: RESOLVE(PATTERN.SINGLETON_COSMOS, 'Cdk-Pipeline', this),
      cdkRepo: CdkRepo,
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', CdkMasterRoleStaticArn, { mutable: false }),
      // deployVpc: this.Vpc,
      deployStacks: [RESOLVE(PATTERN.COSMOS, '*', this)],
    });
    this.CdkDeploy = pipeline.Deploy;

    RemoteVpc.export(this.Vpc, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Vpc', this));
    RemoteZone.export(this.Zone, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Zone', this));
    RemoteCluster.export(this.Cluster, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster', this));
    RemoteAlb.export(this.Alb, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb', this));
    RemoteApplicationListener.export(this.HttpListener, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener', this));
    // RemoteBuildProject.export(`Core${this.Account.Name}${this.Name}`, this.CdkDeploy);
  }
}

export class ImportedCiCdSolarSystem extends Construct implements CiCdSolarSystem {
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly Vpc: IVpc;
  readonly Zone: IHostedZone;
  readonly Cluster: ICluster;
  readonly Alb: IApplicationLoadBalancer;
  readonly HttpListener: IApplicationListener;
  // readonly CdkDeploy: IProject;

  constructor(scope: Construct, galaxy: Galaxy) {
    super(scope, 'CiCdImport');

    this.Galaxy = galaxy;
    this.Name = 'CiCd';

    this.Vpc = RemoteVpc.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Vpc', this), { hasIsolated: true });
    this.Zone = RemoteZone.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Zone', this));
    this.Cluster = RemoteCluster.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Cluster', this), this.Vpc);
    this.Alb = RemoteAlb.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Alb', this));
    this.HttpListener = RemoteApplicationListener.import(
      this,
      RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'HttpListener', this)
    );
    // this.CdkDeploy = RemoteBuildProject.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'CdkPipelineDeploy');
  }
}

export class CiCdSolarSystemExtensionStack extends Stack implements CiCdSolarSystemExtension {
  readonly Galaxy: GalaxyExtension;
  readonly Name: string;
  readonly Portal: EcsSolarSystem;
  readonly DeployPipeline: CdkPipeline;
  readonly DeployProject: Project;

  constructor(galaxy: GalaxyExtension, props?: StackProps) {
    super(galaxy.Cosmos.Scope, stackName(galaxy, 'CiCd'), {
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
      deployStacks: [RESOLVE(PATTERN.COSMOS, '*', this)],
    });
    this.DeployProject = this.DeployPipeline.Deploy;
  }
}
