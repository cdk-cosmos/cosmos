import { Construct, Tag } from '@aws-cdk/core';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosCore } from './cosmos-core-stack';
import { CosmosCoreImportProps, CosmosCoreImport } from './cosmos-core-import';
import { getPackageVersion } from '../helpers/utils';

export interface ICosmosExtension extends Construct {
  portal: ICosmosCore;
  libVersion: string;
  cdkRepo: IRepository;
}

export interface CosmosExtensionStackProps extends BaseStackProps {
  portalProps?: Partial<CosmosCoreImportProps>;
}

export class CosmosExtensionStack extends BaseStack implements ICosmosExtension {
  readonly portal: ICosmosCore;
  readonly libVersion: string;
  readonly cdkRepo: IRepository;

  constructor(scope: Construct, id: string, props?: CosmosExtensionStackProps) {
    super(scope, id, {
      description: 'Cosmos Extension: Singleton resources for the Cosmos, like CdkRepo and EcrRepo',
      partition: 'App',
      type: 'Cosmos',
      ...props,
    });

    const { portalProps } = props || {};

    this.portal = new CosmosCoreImport(this.hidden, this.node.id, {
      ...portalProps,
    });

    this.libVersion = getPackageVersion();
    this.cdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: this.nodeId('Cdk-Repo', '-').toLowerCase(),
      description: `App CDK Repo for ${this.node.id} Cosmos.`,
    });

    Tag.add(this, 'cosmos:extension', this.node.id);
  }
}
