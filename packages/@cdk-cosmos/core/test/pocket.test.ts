import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import { BaseStack } from '../src/base';
import { Bucket } from '@aws-cdk/aws-s3';

const app = new App();

const stack = new BaseStack(app, 'Devops', {
  type: 'Cosmos',
  partition: 'Core',
});

new Bucket(stack, 'Bucket');
new Bucket(stack, 'Bucket2');

const [synth] = synthesizeStacks(stack);

test('should be a stack', () => {
  console.log(synth.stackName);
  expect(synth.template).toMatchSnapshot();
});
