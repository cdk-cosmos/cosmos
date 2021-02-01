import { Construct, Tags, CfnOutput, IConstruct } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosCore } from './cosmos-core-stack';
import { CosmosCoreImportProps, CosmosCoreImport } from './cosmos-core-import';
import { getPackageVersion } from '../helpers/utils';

const COSMOS_EXTENSION_SYMBOL = Symbol.for('@cdk-cosmos/core.CosmosExtensionStack');

export interface ICosmosExtension extends Construct {
  libVersion: string;
  portal: ICosmosCore;
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

    Object.defineProperty(this, COSMOS_EXTENSION_SYMBOL, { value: true });

    const { portalProps } = props || {};

    this.portal = new CosmosCoreImport(this.hidden, this.node.id, {
      ...portalProps,
    });

    this.libVersion = getPackageVersion();

    new CfnOutput(this, 'AppLibVersion', {
      exportName: this.nodeId('LibVersion'),
      value: this.libVersion,
    });

    Tags.of(this).add('cosmos:extension', this.node.id);
  }

  static isCosmosExtension(x: any): x is CosmosExtensionStack {
    return typeof x === 'object' && x !== null && COSMOS_EXTENSION_SYMBOL in x;
  }

  static of(construct: IConstruct): CosmosExtensionStack {
    const scopes = [construct, ...construct.node.scopes];
    for (const scope of scopes) {
      if (CosmosExtensionStack.isCosmosExtension(scope)) return scope;
    }

    throw new Error(`No Cosmos Extension Stack could be identified for the construct at path ${construct.node.path}`);
  }
}
