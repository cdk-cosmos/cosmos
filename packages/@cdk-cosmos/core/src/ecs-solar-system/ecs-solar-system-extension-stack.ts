import { IGalaxyExtension } from '../galaxy/galaxy-extension-stack';
import {
  SolarSystemExtensionStack,
  SolarSystemExtensionStackProps,
  ISolarSystemExtension,
} from '../solar-system/solar-system-extension-stack';
import { IEcsSolarSystemCore } from './ecs-solar-system-core-stack';
import { EcsSolarSystemCoreImport } from './ecs-solar-system-core-import';

export interface IEcsSolarSystemExtension extends ISolarSystemExtension {
  portal: IEcsSolarSystemCore;
}

export const EcsSolarSystemExtensionStackBuilder = (
  base: typeof SolarSystemExtensionStack
): typeof EcsSolarSystemExtensionStackBase => {
  return class EcsSolarSystemExtensionStack extends base implements IEcsSolarSystemExtension {
    readonly portal: EcsSolarSystemCoreImport;

    constructor(galaxy: IGalaxyExtension, id: string, props?: SolarSystemExtensionStackProps) {
      super(galaxy, id, {
        description:
          'Cosmos EcsSolarSystem Extension: App resources dependant on each App Env, like Services and Databases.',
        ...props,
      });

      this.hidden.node.tryRemoveChild(this.portal.node.id);
      this.portal = new EcsSolarSystemCoreImport(this.hidden, id, {
        ...props?.portalProps,
        galaxy: this.galaxy.portal,
      });
    }
  };
};

// Implementations

declare class EcsSolarSystemExtensionStackBase extends SolarSystemExtensionStack implements IEcsSolarSystemExtension {
  readonly portal: EcsSolarSystemCoreImport;

  constructor(galaxy: IGalaxyExtension, id: string, props?: SolarSystemExtensionStackProps);
}
export class EcsSolarSystemExtensionStack extends EcsSolarSystemExtensionStackBuilder(SolarSystemExtensionStack) {}
