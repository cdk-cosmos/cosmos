import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosStack,
  CosmosExtensionStack,
  GalaxyStack,
  GalaxyExtensionStack,
  CiCdSolarSystemStack,
  CiCdSolarSystemExtensionStack,
} from '../src';

const app = new App();
const env = { account: 'account', region: 'region' };

const cosmos = new CosmosStack(app, 'Cos', { tld: 'com', cidr: '10.0.1.0/22', env });
const galaxy = new GalaxyStack(cosmos, 'Gal', { env });
const cicdSolarSystem = new CiCdSolarSystemStack(galaxy, { env });

const cosmosExtension = new CosmosExtensionStack(app, 'Cos', { env });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });
const cicdSolarSystemExtension = new CiCdSolarSystemExtensionStack(galaxyExtension, { env });

const [cicdSolarSystemStack, cicdSolarSystemExtensionStack] = synthesizeStacks(
  cicdSolarSystem,
  cicdSolarSystemExtension
);

describe('CICD-Solar-System', () => {
  test('should be a cicd-solar-system', () => {
    expect(cicdSolarSystemStack.name).toEqual('Core-Cos-Gal-CiCd-SolarSystem');
    expect(cicdSolarSystemStack).toHaveResource('AWS::EC2::VPC');
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Gal-CiCd-Zone-Name', outputValue: 'cicd.cos.com' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Gal-CiCd-Zone-Id' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Gal-CiCd-Cluster-Name' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Gal-CiCd-Alb-Arn' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'Core-Gal-CiCd-HttpListener-Arn' });
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/24', env });
    const galaxy = new GalaxyStack(cosmos, 'Test', {});
    const solarSystem = new CiCdSolarSystemStack(galaxy);
    expect({ account: solarSystem.account, region: solarSystem.region }).toEqual(env);
  });

  test('should throw error if no cidr found', () => {
    expect(() => {
      const app = new App();
      const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
      const galaxy = new GalaxyStack(cosmos, 'Test', {});
      new CiCdSolarSystemStack(galaxy);
    }).toThrowError('NetworkBuilder not found, please define cidr range here (SolarSystem: CiCd) or Galaxy or Cosmos.');
  });

  test('should have cird range', () => {
    let app = new App();
    let cosmos = new CosmosStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/22' });
    let galaxy = new GalaxyStack(cosmos, 'Test', {});
    let solarSystem = new CiCdSolarSystemStack(galaxy);

    expect(solarSystem.NetworkBuilder?.addSubnet(28)).toEqual('10.0.1.0/28');
    expect(solarSystem.NetworkBuilder?.addSubnet(28)).toEqual('10.0.1.16/28');

    app = new App();
    cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
    galaxy = new GalaxyStack(cosmos, 'Test', {});
    solarSystem = new CiCdSolarSystemStack(galaxy, { cidr: '10.0.4.0/22' });
    expect(solarSystem.NetworkBuilder?.addSubnet(28)).toEqual('10.0.5.0/28');
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
    expect(cicdSolarSystemExtensionStack.name).toEqual('App-Cos-Gal-CiCd-SolarSystem');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    const sys = new CiCdSolarSystemExtensionStack(galaxy);
    expect({ account: sys.account, region: sys.region }).toEqual(env);
  });

  test('should match snapshot', () => {
    expect(cicdSolarSystemExtensionStack.template).toMatchSnapshot();
  });
});
