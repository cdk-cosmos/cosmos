import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
} from '../src';

const app = new App();
const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com' });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { cidr: '10.0.1.0/22' });
galaxy.addSharedVpc();
const solarSystem = new SolarSystemCoreStack(galaxy, 'Sys', {
  vpc: galaxy.sharedVpc?.vpc,
  certificate: { subDomains: ['*'] },
});
solarSystem.addEcs();
const solarSystem2 = new SolarSystemCoreStack(galaxy, 'Sys1', {
  vpc: galaxy.sharedVpc?.vpc,
  certificate: false,
});
solarSystem2.addEcs({
  albListenerCidr: '10.0.0.0/8',
});
solarSystem2.ecs?.addDockerConfig({ TEST: 'test' });
solarSystem2.ecs?.addDockerConfig({ TEST2: 'test2' });
solarSystem2.ecs?.addEcsAgentConfig({ TEST: 'test' });
solarSystem2.ecs?.addEcsAgentConfig({ TEST2: 'test2' });

const cosmosExtension = new CosmosExtensionStack(app, 'Test');
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal');
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys');

const [
  solarSystemStack,
  ecsSolarSystemStack,
  solarSystem2Stack,
  ecsSolarSystem2Stack,
  solarSystemExtensionStack,
] = synthesizeStacks(solarSystem, solarSystem.ecs, solarSystem2, solarSystem2.ecs, solarSystemExtension);

describe('ECS-Solar-System', () => {
  test('should be an ecs-solar-system', () => {
    expect(solarSystem.stackName).toEqual('CoreCosGalSysSolarSystem');
    expect(solarSystem.ecs).toHaveOutput({ exportName: 'CoreGalSysClusterName' });
    expect(solarSystem.ecs).toHaveOutput({ exportName: 'CoreGalSysAlbArn' });
    expect(solarSystem.ecs).toHaveOutput({ exportName: 'CoreGalSysHttpListenerArn' });
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
    expect(solarSystem.ecs).toHaveResource('AWS::EC2::SecurityGroup', { SecurityGroupIngress: httpsSgIngress });
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
    expect(solarSystem2.ecs).toHaveResource('AWS::EC2::SecurityGroup', { SecurityGroupIngress: httpSgIngress });
  });

  test('should match snapshot', () => {
    expect(solarSystemStack).toMatchSnapshot();
    expect(ecsSolarSystemStack).toMatchSnapshot();
    expect(solarSystem2Stack).toMatchSnapshot();
    expect(ecsSolarSystem2Stack).toMatchSnapshot();
  });
});

describe('ECS-Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(solarSystemExtension.stackName).toEqual('AppTestGalSysSolarSystem');
  });

  test('should match snapshot', () => {
    expect(solarSystemExtensionStack).toMatchSnapshot();
  });
});
