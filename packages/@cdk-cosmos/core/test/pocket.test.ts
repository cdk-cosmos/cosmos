import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import { BaseStack } from '../src/pocket';
import { Bucket } from '@aws-cdk/aws-s3';

const app = new App();

const stack = new BaseStack(app, 'Devops');
stack.node.type = 'Cosmos';
stack.setPrefix('Core');
stack.setSuffix('v1');

const bucket = new Bucket(stack, 'Bucket');
// bucket.node.pattern=""

const [synth] = synthesizeStacks(stack);

test('should be a stack', () => {
  expect(synth.template).toMatchSnapshot();
});
