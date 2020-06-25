import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  EcsSolarSystemCoreStack,
  EcsSolarSystemExtensionStack,
} from '../src';

const app = new App();
const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com' });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { cidr: '10.0.1.0/22' });
const galaxyVpc = galaxy.addSharedVpc();
const ecsSolarSystem = new EcsSolarSystemCoreStack(galaxy, 'Sys', {
  vpc: galaxyVpc,
  certificate: { subDomains: ['*'] },
});
const ecsSolarSystem1 = new EcsSolarSystemCoreStack(galaxy, 'Sys1', {
  vpc: galaxyVpc,
  listenerInboundCidr: '10.0.0.0/8',
  certificate: false,
});

const cosmosExtension = new CosmosExtensionStack(app, 'Test');
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal');
const ecsSolarSystemExtension = new EcsSolarSystemExtensionStack(galaxyExtension, 'Sys');

const [devEcsSolarSystemStack, devEcsSolarSystemStack1, devEcsSolarSystemExtensionStack] = synthesizeStacks(
  ecsSolarSystem,
  ecsSolarSystem1,
  ecsSolarSystemExtension
);

describe('ECS-Solar-System', () => {
  test('should be an ecs-solar-system', () => {
    expect(devEcsSolarSystemStack.name).toEqual('CoreCosGalSysSolarSystem');
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneName', outputValue: 'sys.cos.com' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneId' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysClusterName' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysAlbArn' });
    expect(devEcsSolarSystemStack).toHaveOutput({ exportName: 'CoreGalSysHttpListenerArn' });
  });
  test('should be an have correct security groups', () => {
    const httpsSgIngress = [
      {
        CidrIp: '0.0.0.0/0',
        Description: 'from 0.0.0.0/0:80',
        FromPort: 80,
        IpProtocol: 'tcp',
        ToPort: 80,
      },
      {
        CidrIp: '0.0.0.0/0',
        Description: 'from 0.0.0.0/0:8080',
        FromPort: 8080,
        IpProtocol: 'tcp',
        ToPort: 8080,
      },
      {
        CidrIp: '0.0.0.0/0',
        Description: 'from 0.0.0.0/0:443',
        FromPort: 443,
        IpProtocol: 'tcp',
        ToPort: 443,
      },
      {
        CidrIp: '0.0.0.0/0',
        Description: 'from 0.0.0.0/0:8443',
        FromPort: 8443,
        IpProtocol: 'tcp',
        ToPort: 8443,
      },
    ];
    expect(devEcsSolarSystemStack).toHaveResource('AWS::EC2::SecurityGroup', { SecurityGroupIngress: httpsSgIngress });
    const httpSgIngress = [
      {
        CidrIp: '10.0.0.0/8',
        Description: 'from 10.0.0.0/8:80',
        FromPort: 80,
        IpProtocol: 'tcp',
        ToPort: 80,
      },
      {
        CidrIp: '10.0.0.0/8',
        Description: 'from 10.0.0.0/8:8080',
        FromPort: 8080,
        IpProtocol: 'tcp',
        ToPort: 8080,
      },
    ];
    expect(devEcsSolarSystemStack1).toHaveResource('AWS::EC2::SecurityGroup', { SecurityGroupIngress: httpSgIngress });
  });

  test('should match snapshot', () => {
    expect(devEcsSolarSystemStack.template).toMatchSnapshot();
  });
});

describe('ECS-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(devEcsSolarSystemExtensionStack.name).toEqual('AppTestGalSysSolarSystem');
  });

  test('should match snapshot', () => {
    expect(devEcsSolarSystemExtensionStack.template).toMatchSnapshot();
  });
});
