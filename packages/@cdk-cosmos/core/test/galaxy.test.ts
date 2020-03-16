import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { SynthUtils } from '@aws-cdk/assert';
import { CosmosStack, CosmosExtensionStack, GalaxyStack, GalaxyExtensionStack } from '../src';

const app = new App();
const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt', {});
const cosmosExtension = new CosmosExtensionStack(app, 'Test', {});
const mgtGalaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Mgt');
const galaxyStack = SynthUtils.synthesize(mgtGalaxy);
const galaxyExtensionStack = SynthUtils.synthesize(mgtGalaxyExtension);

describe('Galaxy', () => {
  test('should be a galaxy', () => {
    expect(galaxyStack.name).toEqual('Core-Test-Mgt-Galaxy');
  });

  test('should match snapshot', () => {
    expect(galaxyStack.template).toMatchSnapshot();
  });
});

describe('Galaxy Extension', () => {
  test('should be a galaxy extension', () => {
    expect(galaxyExtensionStack.name).toEqual('App-Test-Mgt-Galaxy');
  });

  test('should match snapshot', () => {
    expect(galaxyStack.template).toMatchSnapshot();
  });
});
