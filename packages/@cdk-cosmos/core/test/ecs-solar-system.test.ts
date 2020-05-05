import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  EcsSolarSystemCoreStack,
  EcsSolarSystemExtensionStack,
} from '../src';

const app = new App();
const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com' });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { cidr: '10.0.1.0/22' });
const galaxyVpc = galaxy.addSharedVpc();
const ecsSolarSystem = new EcsSolarSystemCoreStack(galaxy, 'Sys', { vpc: galaxyVpc });

const cosmosExtension = new CosmosExtensionStack(app, 'Test');
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal');
const ecsSolarSystemExtension = new EcsSolarSystemExtensionStack(galaxyExtension, 'Sys');

const [devEcsSolarSystemStack, devEcsSolarSystemExtensionStack] = synthesizeStacks(
  ecsSolarSystem,
  ecsSolarSystemExtension
);

describe('ECS-Solar-System', () => {
  test('should be an  ecs-solar-system', () => {
    expect(devEcsSolarSystemStack.name).toEqual('CoreCosGalSysSolarSystem');
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneName', outputValue: 'sys.cos.com' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneId' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysClusterName' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysAlbArn' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysHttpListenerArn' });
  });

  test('should match snapshot', () => {
    expect(devEcsSolarSystemStack.template).toMatchSnapshot();
  });
});

describe('ECS-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(devEcsSolarSystemExtensionStack.name).toEqual('AppTestGalSysSolarSystem');
  });

  test('should match snapshot', () => {
    expect(devEcsSolarSystemExtensionStack.template).toMatchSnapshot();
  });
});
