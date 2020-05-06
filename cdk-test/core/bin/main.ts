#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { CosmosCoreStack, GalaxyCoreStack, CiCdSolarSystemCoreStack, EcsSolarSystemCoreStack } from '@cdk-cosmos/core';

const app = new App();

const mgtEnvConfig = { account: '1111', region: 'ap-southeast-2' };
const devEnvConfig = { account: '2222', region: 'ap-southeast-2' };

const cosmos = new CosmosCoreStack(app, 'Demo', {
  tld: 'cosmos.com',
  env: mgtEnvConfig,
});

const mgtGalaxy = new GalaxyCoreStack(cosmos, 'Mgt', {
  cidr: '10.0.0.0/22',
});

const ciCd = new CiCdSolarSystemCoreStack(mgtGalaxy);

const devGalaxy = new GalaxyCoreStack(cosmos, 'Dev', {
  cidr: '10.0.1.0/22',
  env: devEnvConfig,
});
const devSharedVpc = devGalaxy.addSharedVpc();

const dev = new EcsSolarSystemCoreStack(devGalaxy, 'Dev', {
  vpc: devSharedVpc,
});

const tst = new EcsSolarSystemCoreStack(devGalaxy, 'Tst', {
  vpc: devSharedVpc,
});
