import { Construct } from '@aws-cdk/core';
import { SolarSystemCoreImport } from '../../solar-system/solar-system-core-import';
import { BaseFeatureConstruct, BaseFeatureConstructProps } from '../../components/base';
import { IGithubEnterpriseFeatureCore } from './github-enterprise-feature-core-stack';
import { ISolarSystemCore } from '../../solar-system/solar-system-core-stack';
import { IGithubEnterpriseConnection } from '@cosmos-building-blocks/pipeline/lib/source/github-enterprise-connection';
import { RemoteGithubEnterpriseConnection } from '../../components/remote';

export interface GithubEnterpriseFeatureCoreImportProps extends BaseFeatureConstructProps {
  readonly solarSystem: ISolarSystemCore;
}

export class GithubEnterpriseFeatureCoreImport extends BaseFeatureConstruct implements IGithubEnterpriseFeatureCore {
  readonly solarSystem: ISolarSystemCore;
  readonly connection: IGithubEnterpriseConnection;

  constructor(scope: Construct, id: string, props: GithubEnterpriseFeatureCoreImportProps) {
    super(scope, id, props);

    const { solarSystem } = props;

    this.solarSystem = solarSystem;

    this.connection = RemoteGithubEnterpriseConnection.import(
      this,
      'Connection',
      this.singletonId('GithubEnterpriseConnection')
    );
  }
}

declare module '../../solar-system/solar-system-core-import' {
  interface SolarSystemCoreImport {
    githubEnterprise: GithubEnterpriseFeatureCoreImport;
    addGithubEnterprise(): GithubEnterpriseFeatureCoreImport;
  }
}

SolarSystemCoreImport.prototype.addGithubEnterprise = function (): GithubEnterpriseFeatureCoreImport {
  this.githubEnterprise = new GithubEnterpriseFeatureCoreImport(this, 'GithubEnterprise', {
    solarSystem: this,
  });
  return this.githubEnterprise;
};
