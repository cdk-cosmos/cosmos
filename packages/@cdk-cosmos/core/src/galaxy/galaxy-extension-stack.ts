import { Construct, Tag } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosExtension } from '../cosmos/cosmos-extension-stack';
import { IGalaxyCore } from './galaxy-core-stack';
import { GalaxyCoreImportProps, GalaxyCoreImport } from './galaxy-core-import';

export interface IGalaxyExtension extends Construct {
  cosmos: ICosmosExtension;
  portal: IGalaxyCore;
}

export interface GalaxyExtensionStackProps extends BaseStackProps {
  portalProps?: GalaxyCoreImportProps;
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

    this.cosmos = cosmos;
    this.portal = new GalaxyCoreImport(cosmos.portal, this.node.id, props?.portalProps);

    Tag.add(this, 'cosmos:galaxy:extension', id);
  }
}
