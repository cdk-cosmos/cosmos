import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-codecommit';
import { synthesizeStacks } from '../../../../../src/test';
import { CdkPipeline } from '../../src/helpers/cdk-pipeline';

const app = new App();
const stack = new Stack(app, 'Pipeline', {});
const cdkrepo = new Repository(stack, 'CdkRepo', {
  repositoryName: 'cdk-repo',
});
new CdkPipeline(stack, 'CdkPipeline', { cdkRepo: cdkrepo });
const [testStack] = synthesizeStacks(stack);

describe('Pipeline', () => {
  test('should have master cdk pipeline', () => {
    expect(testStack).toHaveResource('AWS::CodePipeline::Pipeline');
    expect(testStack).toHaveResource('AWS::CodeBuild::Project');
    const bucketEncryption = {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    };
    expect(testStack).toHaveResource('AWS::S3::Bucket', { BucketEncryption: bucketEncryption });
  });

  test('should be able to add stage', () => {
    // TODO: Need to create proper test for function "addCdkDeployEnvStageToPipeline"
    expect(testStack).toHaveResource('AWS::CodePipeline::Pipeline');
    expect(testStack).toHaveResource('AWS::CodeBuild::Project');
  });
});
