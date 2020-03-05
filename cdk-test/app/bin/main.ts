#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import {
  CosmosExtensionStack,
  GalaxyExtensionStack,
  CiCdSolarSystemExtensionStack,
  EcsSolarSystemExtensionStack,
} from '@cdk-cosmos/core';

const app = new App();

const mgtEnvConfig = { account: '1111', region: 'ap-southeast-2' };
const devEnvConfig = { account: '2222', region: 'ap-southeast-2' };

const cosmos = new CosmosExtensionStack(app, 'App', {
  env: mgtEnvConfig,
});

const mgtGalaxy = new GalaxyExtensionStack(cosmos, 'Mgt');

const ciCd = new CiCdSolarSystemExtensionStack(mgtGalaxy);

const devGalaxy = new GalaxyExtensionStack(cosmos, 'Dev', {
  env: devEnvConfig,
});

const dev = new EcsSolarSystemExtensionStack(devGalaxy, 'Dev');

const tst = new EcsSolarSystemExtensionStack(devGalaxy, 'Tst');
