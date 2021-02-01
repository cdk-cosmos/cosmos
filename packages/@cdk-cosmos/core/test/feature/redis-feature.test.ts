import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
} from '../../src';

const env1 = { account: 'account1', region: 'region1' };

const app = new App();

const cosmos = new CosmosCoreStack(app, 'Cos', { env: env1, tld: 'cos.com' });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal');
const solarSystem = new SolarSystemCoreStack(galaxy, 'Sys', { cidr: '10.0.0.0/24' });
const redis = solarSystem.addRedis('Redis');

const cosmosExtension = new CosmosExtensionStack(app, 'CosExt', { env: env1 });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal');
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys');
const redisExtension = solarSystemExtension.addRedis('Redis');

const [solarSystemStack, redisStack, solarSystemExtensionStack, redisExtensionStack] = synthesizeStacks(
  solarSystem,
  redis,
  solarSystemExtension,
  redisExtension
);

describe('Redis Feature for SolarSystem', () => {
  test('should have a redis nested stack', () => {
    expect(solarSystemStack).toMatchSnapshot();
    expect(redisStack).toMatchSnapshot();
  });
});

describe('Redis Feature for SolarSystemExtension', () => {
  test('should have a redis nested stack', () => {
    expect(solarSystemExtensionStack).toMatchSnapshot();
    expect(redisExtensionStack).toMatchSnapshot();
  });
});
