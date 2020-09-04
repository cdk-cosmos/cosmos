import { Construct, Tag, CfnOutput } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosCore } from './cosmos-core-stack';
import { CosmosCoreImportProps, CosmosCoreImport } from './cosmos-core-import';
import { getPackageVersion } from '../helpers/utils';

export interface ICosmosExtension extends Construct {
  portal: ICosmosCore;
  libVersion: string;
}

export interface CosmosExtensionStackProps extends BaseStackProps {
  portalProps?: Partial<CosmosCoreImportProps>;
}

export class CosmosExtensionStack extends BaseStack implements ICosmosExtension {
  readonly portal: ICosmosCore;
  readonly libVersion: string;

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

    new CfnOutput(this, 'AppLibVersion', {
      exportName: this.nodeId('LibVersion'),
      value: this.libVersion,
    });

    Tag.add(this, 'cosmos:extension', this.node.id);
  }
}
