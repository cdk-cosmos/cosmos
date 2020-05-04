import { Construct } from '@aws-cdk/core';
import { IPublicHostedZone, IPrivateHostedZone } from '@aws-cdk/aws-route53';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { IVpc } from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { IProject } from '@aws-cdk/aws-codebuild';
import { IFunction } from '@aws-cdk/aws-lambda';

export interface Bubble {
  Name: string;
  NetworkBuilder?: NetworkBuilder;
  account?: string;
  region?: string;
}

export interface Cosmos extends Bubble, Construct {
  Partition: string;
  Scope: Construct;
  Galaxies?: Galaxy[];
  SolarSystems?: SolarSystem[];
  Version: string;
  Link?: CosmosLink;
  CdkRepo: IRepository;
  RootZone: IPublicHostedZone;
  CdkMasterRoleStaticArn: string;
  CrossAccountExportsFn: IFunction;

  AddGalaxy(galaxy: Galaxy): void;
  AddSolarSystem(solarSystem: SolarSystem): void;
}

export interface CosmosLink extends Bubble, Construct {
  Cosmos: Cosmos;
}

export interface Galaxy extends Bubble, Construct {
  Cosmos: Cosmos;
  SolarSystems?: SolarSystem[];
  CdkCrossAccountRoleStaticArn?: string;

  AddSolarSystem(solarSystem: SolarSystem): void;
}

export interface SolarSystem extends Bubble, Construct {
  Galaxy: Galaxy;
  Vpc: IVpc;
  Zone: IPublicHostedZone;
  PrivateZone: IPrivateHostedZone;
}

export interface EcsSolarSystem extends SolarSystem {
  Cluster: ICluster;
  Alb: IApplicationLoadBalancer;
  HttpListener: IApplicationListener;
  HttpInternalListener: IApplicationListener;
  // HttpsListener: IApplicationListener;
}

export interface CiCdSolarSystem extends SolarSystem {
  readonly CdkDeploy?: IProject;
}
export interface CiCdEcsSolarSystem extends CiCdSolarSystem, EcsSolarSystem {}

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

export interface CiCdSolarSystemExtension extends SolarSystemExtension {
  Galaxy: GalaxyExtension;
  DeployProject: IProject;
}
export interface CiCdEcsSolarSystemExtension extends CiCdSolarSystemExtension, EcsSolarSystemExtension {
  Galaxy: GalaxyExtension;
  DeployProject: IProject;
}
