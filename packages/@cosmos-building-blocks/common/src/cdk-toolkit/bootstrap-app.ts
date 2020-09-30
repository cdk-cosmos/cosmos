import { App } from '@aws-cdk/core';
import { CdkBootstrap } from './cdk-bootstrap';

const deployCore = process.env.CORE === 'true';
const stacks = process.env.STACKS || (deployCore ? 'Core*' : 'App*');

const app = new App();

new CdkBootstrap(app, 'CdkBootstrap', {
  cdkToolkitStackName: 'CDKToolkit',
  stacks: [stacks],
});
