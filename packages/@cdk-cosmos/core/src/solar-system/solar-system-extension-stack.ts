import { Construct, Tag } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../components/base';
import { IGalaxyExtension } from '../galaxy/galaxy-extension-stack';
import { ISolarSystemCore } from './solar-system-core-stack';
import { SolarSystemCoreImport, SolarSystemCoreImportProps } from './solar-system-core-import';

export interface ISolarSystemExtension extends Construct {
  galaxy: IGalaxyExtension;
  portal: ISolarSystemCore;
}

export interface SolarSystemExtensionStackProps extends BaseStackProps {
  portal?: SolarSystemCoreImport;
  portalProps?: Partial<SolarSystemCoreImportProps>;
}

export class SolarSystemExtensionStack extends BaseStack implements ISolarSystemExtension {
  readonly galaxy: IGalaxyExtension;
  readonly portal: SolarSystemCoreImport;

  constructor(galaxy: IGalaxyExtension, id: string, props?: SolarSystemExtensionStackProps) {
    super(galaxy, id, {
      description:
        'Cosmos SolarSystem Extension: App resources dependant on each App Env, like Services and Databases.',
      type: 'SolarSystem',
      ...props,
    });

    const { portal, portalProps } = props || {};

    this.galaxy = galaxy;
    this.portal =
      portal ||
      new SolarSystemCoreImport(this.hidden, this.node.id, {
        ...portalProps,
        galaxy: this.galaxy.portal,
      });

    Tag.add(this, 'cosmos:solarsystem:extension', id);
  }
}
