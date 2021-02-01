import { Construct } from '@aws-cdk/core';
import { SubnetSelection } from '@aws-cdk/aws-ec2';
import {
  IGithubEnterpriseConnection,
  GithubEnterpriseConnection,
  GithubEnterpriseHost,
} from '@cosmos-building-blocks/pipeline/lib/source/github-enterprise-connection';
import { ISolarSystemCore, SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { RemoteGithubEnterpriseConnection } from '../../components/remote';

export interface IGithubEnterpriseFeatureCore extends Construct {
  readonly solarSystem: ISolarSystemCore;
  readonly connection: IGithubEnterpriseConnection;
}

export interface GithubEnterpriseFeatureCoreStackProps extends BaseFeatureStackProps {
  endpoint: string;
  subnets?: SubnetSelection[];
  tlsCertificate?: string;
}

export class GithubEnterpriseFeatureCoreStack extends BaseFeatureStack implements IGithubEnterpriseFeatureCore {
  readonly solarSystem: ISolarSystemCore;
  readonly host: GithubEnterpriseHost;
  readonly connection: GithubEnterpriseConnection;

  constructor(solarSystem: ISolarSystemCore, id: string, props: GithubEnterpriseFeatureCoreStackProps) {
    super(solarSystem, id, {
      description: 'Add Github Enterprise Features to the SolarSystem',
      ...props,
    });

    this.solarSystem = solarSystem;

    this.host = new GithubEnterpriseHost(this, 'Host', {
      ...props,
      hostName: `${id}Host`,
      vpc: this.solarSystem.vpc,
      subnets: [{ subnetGroupName: 'App' }],
    });

    this.connection = new GithubEnterpriseConnection(this, 'Connection', {
      connectionName: `${id}Connection`,
      host: this.host,
    });

    new RemoteGithubEnterpriseConnection(this.connection, this.singletonId('GithubEnterpriseConnection'));
  }
}

// ---- Extension Methods ----

declare module '../../solar-system/solar-system-core-stack' {
  interface SolarSystemCoreStack {
    githubEnterprise: GithubEnterpriseFeatureCoreStack;
    addGithubEnterprise(props: GithubEnterpriseFeatureCoreStackProps): GithubEnterpriseFeatureCoreStack;
  }
}

SolarSystemCoreStack.prototype.addGithubEnterprise = function (props): GithubEnterpriseFeatureCoreStack {
  this.githubEnterprise = new GithubEnterpriseFeatureCoreStack(this, 'GithubEnterprise', props);
  return this.githubEnterprise;
};
