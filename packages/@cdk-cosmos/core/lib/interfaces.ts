import { Construct } from '@aws-cdk/core';
import { IHostedZone } from '@aws-cdk/aws-route53';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { IVpc } from '@aws-cdk/aws-ec2';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { IProject } from '@aws-cdk/aws-codebuild';
import { IRole } from '@aws-cdk/aws-iam';

export interface IBubble extends Construct {
  Name: string;
  account?: string;
  region?: string;
}

export interface ICosmos extends IBubble {
  Scope: Construct;
  Version: string;
  Galaxies?: IGalaxy[];
  SolarSystems?: ISolarSystem[];
  CdkRepo: IRepository;
  RootZone: IHostedZone;
  CdkMasterRoleStaticArn: string;

  AddGalaxy(galaxy: IGalaxy): void;
  AddSolarSystem(solarSystem: ISolarSystem): void;
}

export interface IGalaxy extends IBubble {
  Cosmos: ICosmos;
  SolarSystems?: ISolarSystem[];
  CdkCrossAccountRole?: IRole;

  AddSolarSystem(solarSystem: ISolarSystem): void;
}

export interface ISolarSystem extends IBubble {
  Galaxy: IGalaxy;
  Vpc: IVpc;
  Zone: IHostedZone;
}

export interface IEcsSolarSystem extends ISolarSystem {
  Cluster: ICluster;
  Alb: IApplicationLoadBalancer;
  HttpListener: IApplicationListener;
  // HttpsListener: IApplicationListener;
}

export interface ICiCdSolarSystem extends IEcsSolarSystem {}

// Extensions

export interface IPortal<T extends IBubble> {
  Portal: T;
}

export interface ICosmosExtension extends IBubble, IPortal<ICosmos> {
  Scope: Construct;
  Version: string;
  Galaxies: Array<IGalaxy | IGalaxyExtension>;
  SolarSystems?: Array<ISolarSystem | ISolarSystemExtension>;
  CdkRepo: IRepository;

  AddGalaxy(galaxy: IGalaxy | IGalaxyExtension): void;
  AddSolarSystem(solarSystem: ISolarSystem | ISolarSystemExtension): void;
}

export interface IGalaxyExtension extends IBubble, IPortal<IGalaxy> {
  Cosmos: ICosmosExtension;
  SolarSystems: Array<ISolarSystem | ISolarSystemExtension>;

  AddSolarSystem(solarSystem: ISolarSystem | ISolarSystemExtension): void;
}

export interface ISolarSystemExtension extends IBubble, IPortal<ISolarSystem> {
  Galaxy: IGalaxyExtension;
}

export interface IEcsSolarSystemExtension extends IBubble, IPortal<IEcsSolarSystem> {
  Galaxy: IGalaxyExtension;
}

export interface ICiCdSolarSystemExtension extends IBubble, IPortal<IEcsSolarSystem> {
  Galaxy: IGalaxyExtension;
  DeployProject: IProject;
}