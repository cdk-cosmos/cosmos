import { Construct, Stack, IConstruct, Tags } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosExtension } from '../cosmos/cosmos-extension-stack';
import { IGalaxyCore } from './galaxy-core-stack';
import { GalaxyCoreImportProps, GalaxyCoreImport } from './galaxy-core-import';

const GALAXY_EXTENSION_SYMBOL = Symbol.for('@cdk-cosmos/core.GalaxyExtensionStack');

export interface IGalaxyExtension extends Construct {
  cosmos: ICosmosExtension;
  portal: IGalaxyCore;
}

export interface GalaxyExtensionStackProps extends BaseStackProps {
  portalProps?: Partial<GalaxyCoreImportProps>;
}

export class GalaxyExtensionStack extends BaseStack implements IGalaxyExtension {
  readonly cosmos: ICosmosExtension;
  readonly portal: IGalaxyCore;

  constructor(cosmos: ICosmosExtension, id: string, props?: GalaxyExtensionStackProps) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy Extension: App resources dependant on each Aws Account.',
      type: 'Galaxy',
      ...props,
    });

    Object.defineProperty(this, GALAXY_EXTENSION_SYMBOL, { value: true });

    const { portalProps } = props || {};

    this.cosmos = cosmos;
    this.portal = new GalaxyCoreImport(this.hidden, this.node.id, {
      ...portalProps,
      cosmos: this.cosmos.portal,
    });

    this.addDependency(Stack.of(this.cosmos));
    Tags.of(this).add('cosmos:galaxy:extension', this.node.id);
  }

  static isGalaxyExtension(x: any): x is GalaxyExtensionStack {
    return typeof x === 'object' && x !== null && GALAXY_EXTENSION_SYMBOL in x;
  }

  static of(construct: IConstruct): GalaxyExtensionStack {
    const scopes = [construct, ...construct.node.scopes];
    for (const scope of scopes) {
      if (GalaxyExtensionStack.isGalaxyExtension(scope)) return scope;
    }

    throw new Error(`No Galaxy Core Stack could be identified for the construct at path ${construct.node.path}`);
  }
}
