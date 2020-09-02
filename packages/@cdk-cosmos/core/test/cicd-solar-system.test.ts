import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks, toHaveResourceId } from '../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
} from '../src';

const app = new App();
const env = { account: 'account', region: 'region' };
const env2 = { account: 'account2', region: 'region' };

const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com', cidr: '10.0.1.0/22', env });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { env });
const solarSystem = new SolarSystemCoreStack(galaxy, 'CiCd', { env });
solarSystem.addCiCd();
const solarSystem2 = new SolarSystemCoreStack(galaxy, 'Sys2', { env: env2 });
solarSystem.addDeployStackStage({
  name: 'DeployTest',
  stacks: [solarSystem2],
});

const cosmosExtension = new CosmosExtensionStack(app, 'Test', { env });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'CiCd', { env });
solarSystemExtension.addCiCd();
const solarSystemExtension2 = new SolarSystemExtensionStack(galaxyExtension, 'Sys2', { env: env2 });
solarSystemExtension.addDeployStackStage({
  name: 'DeployTest',
  stacks: [solarSystemExtension2],
});

const [
  cosmosStack,
  solarSystemStack,
  cicdSolarSystemStack,
  cosmosExtensionStack,
  cicdSolarSystemExtensionStack,
] = synthesizeStacks(cosmos, solarSystem, solarSystem.ciCd, cosmosExtension, solarSystemExtension);

describe('CICD-Solar-System', () => {
  test('should be a cicd-solar-system', () => {
    expect(solarSystem.stackName).toEqual('CoreCosGalCiCdSolarSystem');
    expect(solarSystemStack).toHaveResource('AWS::EC2::VPC');
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdZoneName', outputValue: 'cicd.cos.com' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdZoneId' });
  });

  test('should have a CdkRepo', () => {
    expect(cosmosStack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'core-cos-cdk-repo' });
    toHaveResourceId(cosmosStack, 'CdkRepo');
    expect(cosmosStack).toMatchSnapshot({
      Outputs: {
        CoreLibVersion: {
          Value: expect.any(String),
        },
      },
    });
  });

  test('should have master cdk pipeline', () => {
    expect(cicdSolarSystemStack).toHaveResource('AWS::CodePipeline::Pipeline');
    expect(cicdSolarSystemStack).toHaveResource('AWS::CodeBuild::Project');
    const bucketEncryption = {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    };
    expect(cicdSolarSystemStack).toHaveResource('AWS::S3::Bucket', { BucketEncryption: bucketEncryption });
  });

  test('should match snapshot', () => {
    expect(solarSystemStack).toMatchSnapshot();
    expect(cicdSolarSystemStack).toMatchSnapshot();
  });
});

describe('CICD-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(solarSystemExtension.stackName).toEqual('AppTestGalCiCdSolarSystem');
  });

  test('should have a CdkRepo', () => {
    expect(cosmosExtensionStack).toHaveResource('AWS::CodeCommit::Repository', { RepositoryName: 'app-test-cdk-repo' });
    toHaveResourceId(cosmosExtensionStack, 'CdkRepo');
    expect(cosmosExtensionStack).toMatchSnapshot({
      Outputs: {
        CoreLibVersion: {
          Value: expect.any(String),
        },
      },
    });
  });

  test('should have master cdk pipeline', () => {
    expect(cicdSolarSystemExtensionStack).toHaveResource('AWS::CodePipeline::Pipeline');
    expect(cicdSolarSystemExtensionStack).toHaveResource('AWS::CodeBuild::Project');
    const bucketEncryption = {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    };
    expect(cicdSolarSystemExtensionStack).toHaveResource('AWS::S3::Bucket', { BucketEncryption: bucketEncryption });
  });

  test('should match snapshot', () => {
    expect(cicdSolarSystemExtensionStack).toMatchSnapshot();
  });
});
