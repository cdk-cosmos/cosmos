import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { SynthUtils } from '@aws-cdk/assert';
import {
  CosmosStack,
  CosmosExtensionStack,
  GalaxyStack,
  GalaxyExtensionStack,
  SolarSystemStack,
  SolarSystemExtensionStack,
} from '../src';

const app = new App();
const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt', {});
const cosmosExtension = new CosmosExtensionStack(app, 'Test', {});
const mgtGalaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Mgt');
const solarSystem = new SolarSystemStack(mgtGalaxy, 'Dev', { cidr: '10.0.1.0/22' });
const solarSystemExtension = new SolarSystemExtensionStack(mgtGalaxyExtension, 'Dev', {});
const solarSystemStack = SynthUtils.synthesize(solarSystem);
const mgtGalaxyStack = SynthUtils.synthesize(mgtGalaxy);
const solarSystemExtensionStack = SynthUtils.synthesize(solarSystemExtension);

describe('Solar-System', () => {
  test('should throw error if no cidr found', () => {
    try {
      const prdApp = new App();
      const prdCosmos = new CosmosStack(prdApp, 'Test', { tld: 'com' });
      const prdGalaxy = new GalaxyStack(prdCosmos, 'Prd', {});
      const prdSolarSystem = new SolarSystemStack(prdGalaxy, 'Prd', {});
    } catch (error) {
      expect(error.message).toMatch(
        'NetworkBuilder not found, please define cidr range here or Galaxy or Cosmos. (System: Prd).'
      );
    }
  });
  test('should be a solar-system', () => {
    expect(solarSystemStack.name).toEqual('Core-Test-Mgt-Dev-SolarSystem');
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-Zone-Name', outputValue: 'dev.test.com' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-Dev-Zone-Id' });
  });

  test('should create shared vpc in galaxy', () => {
    expect(mgtGalaxyStack).toHaveResource('AWS::EC2::VPC');
    expect(mgtGalaxyStack).toHaveOutput({ exportName: 'Core-Mgt-SharedVpc-Id' });
    expect(mgtGalaxyStack).toHaveOutput({ exportName: 'Core-Mgt-SharedVpc-AZs' });
    expect(mgtGalaxyStack).toHaveOutput({ exportName: 'Core-Mgt-SharedVpc-IsolatedSubnetIds' });
    expect(mgtGalaxyStack).toHaveOutput({ exportName: 'Core-Mgt-SharedVpc-IsolatedSubnetRouteTableIds' });
  });

  test('should match snapshot', () => {
    expect(solarSystemStack.template).toMatchSnapshot();
  });
});

describe('Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(solarSystemExtensionStack.name).toEqual('App-Test-Mgt-Dev-SolarSystem');
  });

  test('should match snapshot', () => {
    expect(solarSystemExtensionStack.template).toMatchSnapshot();
  });
});
