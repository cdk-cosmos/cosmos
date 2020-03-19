import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks, toHaveResourceId, toHaveResourceCount } from '../../../../src/test';
import { CosmosStack, CosmosExtensionStack } from '../src';

const app = new App();
const cosmos = new CosmosStack(app, 'Cos', { tld: 'com', cidr: '10.0.0.0/24' });
const cosmosExtension = new CosmosExtensionStack(app, 'Test');
const [cosmosStack, cosmosExtensionStack] = synthesizeStacks(cosmos, cosmosExtension);

describe('Cosmos', () => {
  test('should be a cosmos', () => {
    expect(cosmosStack.name).toEqual('Core-Cos-Cosmos');
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-Name', outputValue: 'Cos' });
    expect(cosmosStack).toHaveOutput({ exportName: 'Core-Version' });
    toHaveResourceCount(cosmosStack, 4);
  });

  test('should have a RootZone', () => {
    expect(cosmosStack).toHaveResource('AWS::Route53::HostedZone', { Name: 'cos.com.' });
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

  test('should have cidr range', () => {
    expect(cosmos.NetworkBuilder?.addSubnet(28)).toEqual('10.0.0.0/28');
    expect(cosmos.NetworkBuilder?.addSubnet(28)).toEqual('10.0.0.16/28');
  });

  test('should match snapshot', () => {
    expect(cosmosStack.template).toMatchSnapshot({
      // These param change a lot ...
      Parameters: expect.any(Object),
      Resources: {
        CrossAccountExportsFnBB7349E9: {
          Properties: { Code: { S3Bucket: expect.any(Object), S3Key: expect.any(Object) } },
        },
      },
    });
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
