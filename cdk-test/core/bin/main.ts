#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { CosmosCoreStack, GalaxyCoreStack, SolarSystemCoreStack } from '@cdk-cosmos/core';

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

const ciCd = new SolarSystemCoreStack(mgtGalaxy, 'CiCd');
ciCd.addCiCd();

const devGalaxy = new GalaxyCoreStack(cosmos, 'Dev', {
  cidr: '10.0.1.0/22',
  env: devEnvConfig,
});
devGalaxy.addSharedVpc();

const dev = new SolarSystemCoreStack(devGalaxy, 'Dev', {
  vpc: devGalaxy.sharedVpc?.vpc,
});
dev.addEcs();

const tst = new SolarSystemCoreStack(devGalaxy, 'Tst', {
  vpc: devGalaxy.sharedVpc?.vpc,
});
tst.addEcs();
