import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { SynthUtils } from '@aws-cdk/assert';
import { CloudFormationStackArtifact } from '@aws-cdk/cx-api';
import { CosmosStack, CosmosExtensionStack } from '../src';

const toHaveResourceId = (stack: CloudFormationStackArtifact, id: string): void => {
  expect(stack.template.Resources).toHaveProperty(id);
};

const toHaveResourceCount = (stack: CloudFormationStackArtifact, length: number): void => {
  expect(Object.keys(stack.template.Resources)).toHaveLength(length);
};

const app = new App();
const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
const cosmosExtension = new CosmosExtensionStack(app, 'Test');
const cosmosStack = SynthUtils.synthesize(cosmos);
const cosmosExtensionStack = SynthUtils.synthesize(cosmosExtension);

describe('Cosmos', () => {
  test('should be a cosmos', () => {
    expect(cosmosStack.name).toEqual('Core-Test-Cosmos');
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-Name', outputValue: 'Test' });
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-Version' });
    toHaveResourceCount(cosmosStack, 4);
  });

  test('should have a RootZone', () => {
    expect(cosmosStack).toHaveResource('AWS::Route53::HostedZone', { Name: 'test.com.' });
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-RootZone-Id' });
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-RootZone-Name' });
    toHaveResourceId(cosmosStack, 'RootZone831A5F27');
  });

  test('should have a CdkRepo', () => {
    expect(cosmosStack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'core-cdk-repo' });
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-CdkRepo-Name' });
    toHaveResourceId(cosmosStack, 'CdkRepo9606A710');
  });

  test('should have a CdkMasterRole', () => {
    expect(cosmosStack).toHaveResource('AWS::IAM::Role', { RoleName: 'Core-CdkMaster-Role' });
    toHaveResourceId(cosmosStack, 'CdkMasterRole2FE9B317');
  });

  test('should match snapshot', () => {
    expect(cosmosStack.template).toMatchSnapshot();
  });
});

describe('Cosmos Extension', () => {
  test('should be a cosmos extension', () => {
    expect(cosmosExtensionStack.name).toEqual('App-Test-Cosmos');
    toHaveResourceCount(cosmosExtensionStack, 1);
  });

  test('should have a CdkRepo', () => {
    expect(cosmosExtensionStack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'app-test-cdk-repo' });
    toHaveResourceId(cosmosExtensionStack, 'CdkRepo9606A710');
  });

  //TODO: Check if imports align

  test('should match snapshot', () => {
    expect(cosmosExtensionStack.template).toMatchSnapshot();
  });
});
