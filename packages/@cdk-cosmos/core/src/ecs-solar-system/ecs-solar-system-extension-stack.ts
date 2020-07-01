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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const EcsSolarSystemExtensionStackBuilder = (base: typeof SolarSystemExtensionStack) => {
  class EcsSolarSystemExtensionStack extends base implements IEcsSolarSystemExtension {
    readonly portal: InstanceType<typeof EcsSolarSystemCoreImport>;

    constructor(galaxy: IGalaxyExtension, id: string, props?: SolarSystemExtensionStackProps) {
      super(galaxy, id, {
        description:
          'Cosmos EcsSolarSystem Extension: App resources dependant on each App Env, like Services and Databases.',
        portal: new EcsSolarSystemCoreImport(galaxy.portal, id, props?.portalProps),
        ...props,
      });
    }
  }

  return EcsSolarSystemExtensionStack;
};

export const EcsSolarSystemExtensionStack = EcsSolarSystemExtensionStackBuilder(SolarSystemExtensionStack);
