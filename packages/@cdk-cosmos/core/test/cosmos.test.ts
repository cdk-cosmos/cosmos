import '@aws-cdk/assert/jest';
import { App, Construct } from '@aws-cdk/core';
import { synthesizeStacks, toHaveResourceId, toHaveResourceCount } from '../../../../src/test';
import { CosmosCoreStack, CosmosExtensionStack } from '../src';
import { CnameRecord } from '@aws-cdk/aws-route53';

const app = new App();
const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com', cidr: '10.0.0.0/24' });
const cosmosExtension = new CosmosExtensionStack(app, 'Test');
const [cosmosStack, cosmosExtensionStack] = synthesizeStacks(cosmos, cosmosExtension);

describe('Cosmos', () => {
  test('should be a cosmos', () => {
    expect(cosmosStack.name).toEqual('CoreCosCosmos');
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreLibVersion' });
    toHaveResourceCount(cosmosStack, 4);
  });

  test('should have a RootZone', () => {
    expect(cosmosStack).toHaveResource('AWS::Route53::HostedZone', { Name: 'cos.com.' });
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreRootZoneId' });
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreRootZoneName' });
    toHaveResourceId(cosmosStack, 'RootZone');
  });

  test('should have a CdkRepo', () => {
    expect(cosmosStack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'core-cos-cdk-repo' });
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreCdkRepoName' });
    toHaveResourceId(cosmosStack, 'CdkRepo');
  });

  test('should have a CdkMasterRole', () => {
    expect(cosmosStack).toHaveResource('AWS::IAM::Role', { RoleName: 'CoreCdkMasterRole' });
    toHaveResourceId(cosmosStack, 'CdkMasterRole');
  });

  test('should have cidr range', () => {
    expect(cosmos.networkBuilder?.addSubnet(28)).toEqual('10.0.0.0/28');
    expect(cosmos.networkBuilder?.addSubnet(28)).toEqual('10.0.0.16/28');
  });

  test('should match snapshot', () => {
    expect(cosmosStack.template).toMatchSnapshot({
      Outputs: {
        CoreLibVersion: {
          Value: expect.any(String),
        },
      },
    });
  });
});

describe('Cosmos Extension', () => {
  test('should be a cosmos extension', () => {
    expect(cosmosExtensionStack.name).toEqual('AppTestCosmos');
    toHaveResourceCount(cosmosExtensionStack, 1);
  });

  test('should have a CdkRepo', () => {
    expect(cosmosExtensionStack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'app-test-cdk-repo' });
    toHaveResourceId(cosmosExtensionStack, 'CdkRepo');
  });

  test('should allow resourced to be created in portal', () => {
    const app = new App();
    const cosmosExtension = new CosmosExtensionStack(app, 'Test');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new CnameRecord((cosmosExtension.portal.rootZone as any) as Construct, 'Test', {
      zone: cosmosExtension.portal.rootZone,
      recordName: 'test',
      domainName: 'test',
    });
    const [cosmosExtensionStack] = synthesizeStacks(cosmosExtension);
    expect(cosmosExtensionStack.template).toMatchSnapshot();
  });

  //TODO: Check if imports align

  test('should match snapshot', () => {
    expect(cosmosExtensionStack.template).toMatchSnapshot();
  });
});
