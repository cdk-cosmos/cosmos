import { Construct, Stack, IConstruct, Tags } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../components/base';
import { IGalaxyExtension } from '../galaxy/galaxy-extension-stack';
import { ISolarSystemCore } from './solar-system-core-stack';
import { SolarSystemCoreImport, SolarSystemCoreImportProps } from './solar-system-core-import';

const SOLAR_SYSTEM_EXTENSION_SYMBOL = Symbol.for('@cdk-cosmos/core.SolarSystemExtensionStack');

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

    Object.defineProperty(this, SOLAR_SYSTEM_EXTENSION_SYMBOL, { value: true });

    const { portal, portalProps } = props || {};

    this.galaxy = galaxy;
    this.portal =
      portal ||
      new SolarSystemCoreImport(this.hidden, this.node.id, {
        ...portalProps,
        galaxy: this.galaxy.portal,
      });

    this.addDependency(Stack.of(this.galaxy));
    Tags.of(this).add('cosmos:solarsystem:extension', id);
  }

  static isSolarSystemExtension(x: any): x is SolarSystemExtensionStack {
    return typeof x === 'object' && x !== null && SOLAR_SYSTEM_EXTENSION_SYMBOL in x;
  }

  static of(construct: IConstruct): SolarSystemExtensionStack {
    const scopes = [construct, ...construct.node.scopes];
    for (const scope of scopes) {
      if (SolarSystemExtensionStack.isSolarSystemExtension(scope)) return scope;
    }

    throw new Error(`No Galaxy Core Stack could be identified for the construct at path ${construct.node.path}`);
  }
}
