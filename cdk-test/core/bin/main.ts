#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { CosmosStack, GalaxyStack, CiCdSolarSystemStack, EcsSolarSystemStack } from '@cdk-cosmos/core';
import { CDKToolkit } from '@cosmos-building-blocks/common';
import { TgwConnect } from '@cosmos-building-blocks/transit-gateway';
import { Vpc } from '@aws-cdk/aws-ec2';

const app = new App();

const mgtEnvConfig = { account: '1111', region: 'ap-southeast-2' };
const devEnvConfig = { account: '2222', region: 'ap-southeast-2' };

const bootstrapMgt = new CDKToolkit(app, 'CDKToolkitMgt', {
  env: mgtEnvConfig,
});

const bootstrapDev = new CDKToolkit(app, 'CDKToolkitDev', {
  env: devEnvConfig,
});

const cosmos = new CosmosStack(app, 'Demo', {
  tld: 'cosmos.com',
  env: mgtEnvConfig,
});

const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt', {
  cidr: '10.0.0.0/22',
});

const ciCd = new CiCdSolarSystemStack(mgtGalaxy);

const devGalaxy = new GalaxyStack(cosmos, 'Dev', {
  cidr: '10.0.1.0/22',
  env: devEnvConfig,
});
const devSharedVpc = devGalaxy.AddSharedVpc();

const dev = new EcsSolarSystemStack(devGalaxy, 'Dev', {
  vpc: devSharedVpc,
});

// Connect the dev solarsystem to shared TGW
new TgwConnect(dev.Galaxy, 'MyTgwConnection', {
  vpc: dev.Vpc,
  transitGatewayId: 'tgw-0d4180d3e7c919164',
  tgwDestinationCidr: '10.0.0.0/8',
  resolverRuleId: 'rslvr-rr-a5c8a7ee5efb41eab',
});

// Create Test solarsystem
const tst = new EcsSolarSystemStack(devGalaxy, 'Tst', {
  vpc: devSharedVpc,
});
