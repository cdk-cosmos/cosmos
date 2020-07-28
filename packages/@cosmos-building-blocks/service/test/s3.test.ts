import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { SecureBucket } from '../src';

const app = new App();
const stack = new Stack(app, 'aws-secure-bucket');
new SecureBucket(stack, 'SecureBucket', {});

const synth = SynthUtils.toCloudFormation(stack);

test('Secure Bucket', () => {
  expect(synth).toMatchSnapshot();
});
