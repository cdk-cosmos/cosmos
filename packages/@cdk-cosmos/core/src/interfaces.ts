import { Construct } from '@aws-cdk/core';
import { IHostedZone } from '@aws-cdk/aws-route53';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { IVpc } from '@aws-cdk/aws-ec2';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { IProject } from '@aws-cdk/aws-codebuild';
import { IRole } from '@aws-cdk/aws-iam';

export interface Bubble {
  Name: string;
  account?: string;
  region?: string;
}

export interface Cosmos extends Bubble, Construct {
  Partition: string;
  Scope: Construct;
  Version: string;
  Galaxies?: Galaxy[];
  SolarSystems?: SolarSystem[];
  CdkRepo: IRepository;
  RootZone: IHostedZone;
  CdkMasterRoleStaticArn: string;

  AddGalaxy(galaxy: Galaxy): void;
  AddSolarSystem(solarSystem: SolarSystem): void;
}

export interface Galaxy extends Bubble, Construct {
  Cosmos: Cosmos;
  SolarSystems?: SolarSystem[];
  CdkCrossAccountRole?: IRole;

  AddSolarSystem(solarSystem: SolarSystem): void;
}

export interface SolarSystem extends Bubble, Construct {
  Galaxy: Galaxy;
  Vpc: IVpc;
  Zone: IHostedZone;
}

export interface EcsSolarSystem extends SolarSystem {
  Cluster: ICluster;
  Alb: IApplicationLoadBalancer;
  HttpListener: IApplicationListener;
  // HttpsListener: IApplicationListener;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CiCdSolarSystem extends EcsSolarSystem {}

// Extensions

export interface Extension<T extends Bubble & Construct> extends Bubble, Construct {
  Portal: T;
}

export interface CosmosExtension extends Extension<Cosmos> {
  Partition: string;
  Scope: Construct;
  Version: string;
  Galaxies: Array<Galaxy | GalaxyExtension>;
  SolarSystems?: Array<SolarSystem | SolarSystemExtension>;
  CdkRepo: IRepository;

  AddGalaxy(galaxy: Galaxy | GalaxyExtension): void;
  AddSolarSystem(solarSystem: SolarSystem | SolarSystemExtension): void;
}

export interface GalaxyExtension extends Extension<Galaxy> {
  Cosmos: CosmosExtension;
  SolarSystems: Array<SolarSystem | SolarSystemExtension>;

  AddSolarSystem(solarSystem: SolarSystem | SolarSystemExtension): void;
}

export interface SolarSystemExtension extends Extension<SolarSystem> {
  Galaxy: GalaxyExtension;
}

export interface EcsSolarSystemExtension extends SolarSystemExtension {
  Galaxy: GalaxyExtension;
}

export interface CiCdSolarSystemExtension extends EcsSolarSystemExtension {
  Galaxy: GalaxyExtension;
  DeployProject: IProject;
}
