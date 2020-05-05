import { Construct, IConstruct } from '@aws-cdk/core';
import { IPublicHostedZone, IPrivateHostedZone } from '@aws-cdk/aws-route53';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { IVpc } from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { IProject } from '@aws-cdk/aws-codebuild';
import { IFunction } from '@aws-cdk/aws-lambda';

export interface IBubble {
  NetworkBuilder?: NetworkBuilder;
  // account?: string;
  // region?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CiCdSolarSystem extends EcsSolarSystem {}

// Extensions

export interface CiCdSolarSystemExtension extends EcsSolarSystemExtension {
  Galaxy: GalaxyExtension;
  DeployProject: IProject;
}
