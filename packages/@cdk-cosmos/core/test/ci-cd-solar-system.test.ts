import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { SynthUtils } from '@aws-cdk/assert';
import {
  CosmosStack,
  CosmosExtensionStack,
  GalaxyStack,
  GalaxyExtensionStack,
  CiCdSolarSystemStack,
  CiCdSolarSystemExtensionStack,
} from '../src';

const app = new App();
const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt', {});
const cosmosExtension = new CosmosExtensionStack(app, 'Test', {});
const mgtGalaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Mgt');
const cicdSolarSystem = new CiCdSolarSystemStack(mgtGalaxy, { cidr: '10.0.1.0/22' });
const cicdSolarSystemExtension = new CiCdSolarSystemExtensionStack(mgtGalaxyExtension);
const cicdSolarSystemStack = SynthUtils.synthesize(cicdSolarSystem);
const cicdSolarSystemExtensionStack = SynthUtils.synthesize(cicdSolarSystemExtension);

describe('CICD-Solar-System', () => {
  test('should be a cicd-solar-system', () => {
    expect(cicdSolarSystemStack.name).toEqual('Core-Test-Mgt-CiCd-SolarSystem');
    expect(cicdSolarSystemStack).toHaveResource('AWS::EC2::VPC');
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-CiCd-Zone-Name', outputValue: 'cicd.test.com' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-CiCd-Zone-Id' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-CiCd-Cluster-Name' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-CiCd-Alb-Arn' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Mgt-CiCd-HttpListener-Arn' });
  });

  test('should throw error if no cidr found', () => {
    try {
      const prdApp = new App();
      const prdCosmos = new CosmosStack(prdApp, 'Test', { tld: 'com' });
      const prdGalaxy = new GalaxyStack(prdCosmos, 'Prd', {});
      const prdcicdSolarSystem = new CiCdSolarSystemStack(prdGalaxy, {});
    } catch (error) {
      expect(error.message).toMatch(
        'NetworkBuilder not found, please define cidr range here or Galaxy or Cosmos. (System: CiCd).'
      );
    }
  });

  test('should have master cdk pipeline', () => {
    expect(cicdSolarSystemStack).toHaveResource('AWS::CodePipeline::Pipeline', { Name: 'Core-Cdk-Pipeline' });
    expect(cicdSolarSystemStack).toHaveResource('AWS::CodeBuild::Project', { Name: 'Core-Cdk-PipelineDeploy' });
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
    expect(cicdSolarSystemStack.template).toMatchSnapshot();
  });
});

describe('CICD-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(cicdSolarSystemExtensionStack.name).toEqual('App-Test-Mgt-CiCd-SolarSystem');
  });

  test('should match snapshot', () => {
    expect(cicdSolarSystemExtensionStack.template).toMatchSnapshot();
  });
});
