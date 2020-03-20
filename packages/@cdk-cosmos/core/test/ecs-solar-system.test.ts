import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosStack,
  CosmosExtensionStack,
  GalaxyStack,
  GalaxyExtensionStack,
  EcsSolarSystemStack,
  EcsSolarSystemExtensionStack,
} from '../src';

const app = new App();
const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt', {});
const cosmosExtension = new CosmosExtensionStack(app, 'Test', {});
const mgtGalaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Mgt');
const devEcsSolarSystem = new EcsSolarSystemStack(mgtGalaxy, 'Dev', { cidr: '10.0.1.0/22' });
const devEcsSolarSystemExtension = new EcsSolarSystemExtensionStack(mgtGalaxyExtension, 'Dev');
const [devEcsSolarSystemStack, devEcsSolarSystemExtensionStack] = synthesizeStacks(
  devEcsSolarSystem,
  devEcsSolarSystemExtension
);

describe('ECS-Solar-System', () => {
  test('should be an  ecs-solar-system', () => {
    expect(devEcsSolarSystemStack.name).toEqual('Core-Test-Mgt-Dev-SolarSystem');
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-Zone-Name', outputValue: 'dev.test.com' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-Zone-Id' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-Cluster-Name' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-Alb-Arn' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-HttpListener-Arn' });
  });

  test('should match snapshot', () => {
    expect(devEcsSolarSystemStack.template).toMatchSnapshot();
  });
});

describe('ECS-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(devEcsSolarSystemExtensionStack.name).toEqual('App-Test-Mgt-Dev-SolarSystem');
  });

  test('should match snapshot', () => {
    expect(devEcsSolarSystemExtensionStack.template).toMatchSnapshot();
  });
});
