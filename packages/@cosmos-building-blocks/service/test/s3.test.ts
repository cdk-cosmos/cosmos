import { SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as s3 from '../src/index';

test('Empty Stack', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'aws-secure-bucket');

  //WHEN
  // new s3.SecureBucket(stack, 'SecureBucket', { serverAccessLogsPrefix: '' });
  new s3.SecureBucket(stack, 'SecureBucket', {});
  // THEN
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
