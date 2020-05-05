import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import { CosmosCoreStack, CosmosExtensionStack, GalaxyCoreStack, GalaxyExtensionStack } from '../src';

const app = new App();
const env = { account: 'account', region: 'region' };
const env2 = { account: 'account2', region: 'region2' };

const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'com', cidr: '10.0.0.0/24', env });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { env });
const galaxy2 = new GalaxyCoreStack(cosmos, 'Gal2', { env: env2 });

const cosmosExtension = new CosmosExtensionStack(app, 'Test', { env });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });

const [galaxyStack, galaxy2Stack, galaxyExtensionStack] = synthesizeStacks(galaxy, galaxy2, galaxyExtension);

describe('Galaxy', () => {
  test('should be a galaxy', () => {
    expect(galaxyStack.name).toEqual('CoreCosGalGalaxy');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/24', env });
    const galaxy = new GalaxyCoreStack(cosmos, 'Test');
    expect({ account: galaxy.account, region: galaxy.region }).toEqual(env);
  });

  test('should have cird range', () => {
    let app = new App();
    let cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/24' });
    let galaxy = new GalaxyCoreStack(cosmos, 'Test');

    expect(galaxy.networkBuilder?.addSubnet(28)).toEqual('10.0.0.0/28');
    expect(galaxy.networkBuilder?.addSubnet(28)).toEqual('10.0.0.16/28');

    app = new App();
    cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com' });
    galaxy = new GalaxyCoreStack(cosmos, 'Test2', { cidr: '10.0.1.0/24' });
    expect(galaxy.networkBuilder?.addSubnet(28)).toEqual('10.0.1.0/28');
  });

  test('should be cross account galaxy', () => {
    expect(galaxy2Stack).toHaveResource('AWS::IAM::Role');
  });

  test('should match snapshot', () => {
    expect(galaxyStack.template).toMatchSnapshot();
    expect(galaxy2Stack.template).toMatchSnapshot();
  });
});

describe('Galaxy Extension', () => {
  test('should be a galaxy extension', () => {
    expect(galaxyExtensionStack.name).toEqual('AppTestGalGalaxy');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    expect({ account: galaxy.account, region: galaxy.region }).toEqual(env);
  });

  test('should match snapshot', () => {
    expect(galaxyExtensionStack.template).toMatchSnapshot();
  });
});
