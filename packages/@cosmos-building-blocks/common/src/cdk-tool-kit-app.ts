import { App } from '@aws-cdk/core';
import { CDKToolKit } from './cdk-tool-kit';

const app = new App();
new CDKToolKit(app, 'CDKToolkit');
