#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, CfnOutput, Fn } from '@aws-cdk/core';
import { CosmosStack, GalaxyStack, CiCdSolarSystemStack, EcsSolarSystemStack } from '@cdk-cosmos/core';
import { CDKToolkit, CrossAccountStackReference, CrossAccountStackReferenceFn } from '@cosmos-building-blocks/common';
import { Role } from '@aws-cdk/aws-iam';

const app = new App();

const stack = new Stack(app, 'Test');
const lambda = new CrossAccountStackReferenceFn(stack, 'CrossAccountStackReferenceFn', {
  role: Role.fromRoleArn(stack, 'Core-CdkMaster-Role', 'arn:aws:iam::583682874749:role/Core-CdkMaster-Role'),
});
const ref = new CrossAccountStackReference(stack, 'TestReference', {
  fn: lambda,
  exports: 'Core-CdkRepo-Name',
});
new CfnOutput(stack, 'TestOutput', {
  value: ref.getExport('Core-CdkRepo-Name'),
});

// const mgtEnvConfig = { account: '1111', region: 'ap-southeast-2' };
// const devEnvConfig = { account: '2222', region: 'ap-southeast-2' };

// const bootstrapMgt = new CDKToolkit(app, 'CDKToolkitMgt', {
//   env: mgtEnvConfig,
// });

// const bootstrapDev = new CDKToolkit(app, 'CDKToolkitDev', {
//   env: devEnvConfig,
// });

// const cosmos = new CosmosStack(app, 'Demo', {
//   tld: 'cosmos.com',
//   env: mgtEnvConfig,
// });

// const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt', {
//   cidr: '10.0.0.0/22',
// });

// const ciCd = new CiCdSolarSystemStack(mgtGalaxy);

// const devGalaxy = new GalaxyStack(cosmos, 'Dev', {
//   cidr: '10.0.1.0/22',
//   env: devEnvConfig,
// });

// const dev = new EcsSolarSystemStack(devGalaxy, 'Dev');

// const tst = new EcsSolarSystemStack(devGalaxy, 'Tst');

// const internet = new IntenetSolution('ARN', [cosmos.SolarSystems[0].Vpc]);
// // for each vpc found then create an transit attachment in the stack.of(vpc)

// const link = new LinkZones(cosmos, 'test', [dev, tst, ciCd, prd]);
