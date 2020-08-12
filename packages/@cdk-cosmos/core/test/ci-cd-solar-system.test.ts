import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  CiCdSolarSystemCoreStack,
  CiCdSolarSystemExtensionStack,
  CiCdEcsSolarSystemCoreStack,
} from '../src';

const app = new App();
const env = { account: 'account', region: 'region' };

const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com', cidr: '10.0.1.0/22', env });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { env });
const cicdSolarSystem = new CiCdEcsSolarSystemCoreStack(galaxy, { env });

const cosmosExtension = new CosmosExtensionStack(app, 'Test', { env });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });
const cicdSolarSystemExtension = new CiCdSolarSystemExtensionStack(galaxyExtension, { env });

const [cicdSolarSystemStack, cicdSolarSystemExtensionStack] = synthesizeStacks(
  cicdSolarSystem,
  cicdSolarSystemExtension
);

describe('CICD-Solar-System', () => {
  test('should be a cicd-solar-system', () => {
    expect(cicdSolarSystem.stackName).toEqual('CoreCosGalCiCdSolarSystem');
    expect(cicdSolarSystemStack).toHaveResource('AWS::EC2::VPC');
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdZoneName', outputValue: 'cicd.cos.com' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdZoneId' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdClusterName' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdAlbArn' });
    expect(cicdSolarSystemStack).toHaveOutput({ exportName: 'CoreGalCiCdHttpListenerArn' });
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/24', env });
    const galaxy = new GalaxyCoreStack(cosmos, 'Test', {});
    const solarSystem = new CiCdSolarSystemCoreStack(galaxy);
    expect({ account: solarSystem.account, region: solarSystem.region }).toEqual(env);
  });

  test('should throw error if no cidr found', () => {
    expect(() => {
      const app = new App();
      const cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com' });
      const galaxy = new GalaxyCoreStack(cosmos, 'Test', {});
      new CiCdSolarSystemCoreStack(galaxy);
    }).toThrowError('Network Builder must be provided.');
  });

  test('should have cird range', () => {
    let app = new App();
    let cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/22' });
    let galaxy = new GalaxyCoreStack(cosmos, 'Test', {});
    let solarSystem = new CiCdSolarSystemCoreStack(galaxy);

    expect(solarSystem.networkBuilder?.addSubnet(28)).toEqual('10.0.1.0/28');
    expect(solarSystem.networkBuilder?.addSubnet(28)).toEqual('10.0.1.16/28');

    app = new App();
    cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com' });
    galaxy = new GalaxyCoreStack(cosmos, 'Test', {});
    solarSystem = new CiCdSolarSystemCoreStack(galaxy, { cidr: '10.0.4.0/22' });
    expect(solarSystem.networkBuilder?.addSubnet(28)).toEqual('10.0.5.0/28');
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
    expect(cicdSolarSystemStack).toMatchSnapshot();
  });
});

describe('CICD-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(cicdSolarSystemExtension.stackName).toEqual('AppTestGalCiCdSolarSystem');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    const sys = new CiCdSolarSystemExtensionStack(galaxy);
    expect({ account: sys.account, region: sys.region }).toEqual(env);
  });

  test('should match snapshot', () => {
    expect(cicdSolarSystemExtensionStack).toMatchSnapshot();
  });
});
