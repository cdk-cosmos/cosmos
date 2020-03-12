import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { SynthUtils } from '@aws-cdk/assert';
import { CloudFormationStackArtifact } from '@aws-cdk/cx-api';
import { CosmosStack } from '../src';

const toHaveResourceId = (stack: CloudFormationStackArtifact, id: string): void => {
  expect(stack.template.Resources).toHaveProperty(id);
};

const app = new App();
const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
const stack = SynthUtils.synthesize(cosmos);

describe('Cosmos', () => {
  test('should be a cosmos', () => {
    expect(stack.name).toEqual('Core-Test-Cosmos');
    expect(stack).toHaveOutput({ exportName: 'Core-Name', outputValue: 'Test' });
    expect(stack).toHaveOutput({ exportName: 'Core-Version' });
    expect(Object.keys(stack.template.Resources)).toHaveLength(3);
    expect(stack.template).toMatchSnapshot();
  });

  test('should have a RootZone', () => {
    expect(stack).toHaveResource('AWS::Route53::HostedZone', { Name: 'test.com.' });
    expect(stack).toHaveOutput({ exportName: 'Core-RootZone-Id' });
    expect(stack).toHaveOutput({ exportName: 'Core-RootZone-Name' });
    toHaveResourceId(stack, 'RootZone831A5F27');
  });

  test('should have a CdkRepo', () => {
    expect(stack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'core-cdk-repo' });
    expect(stack).toHaveOutput({ exportName: 'Core-CdkRepo-Name' });
    toHaveResourceId(stack, 'CdkRepo9606A710');
  });

  test('should have a CdkMasterRole', () => {
    expect(stack).toHaveResource('AWS::IAM::Role', { RoleName: 'Core-CdkMaster-Role' });
    toHaveResourceId(stack, 'CdkMasterRole2FE9B317');
  });
});
