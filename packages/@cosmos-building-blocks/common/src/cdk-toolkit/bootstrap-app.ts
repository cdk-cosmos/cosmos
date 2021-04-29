import { App } from '@aws-cdk/core';
import { CdkBootstrap } from './cdk-bootstrap';

const stacks = process.env.STACKS || '*Cosmos *Galaxy *CiCdSolarSystem';

const app = new App();

new CdkBootstrap(app, 'CdkBootstrap', {
  cdkToolkitStackName: 'CDKToolkit',
  stacks: stacks.split(' '),
});
