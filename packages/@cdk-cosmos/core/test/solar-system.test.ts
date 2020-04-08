import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import {
  CosmosStack,
  CosmosExtensionStack,
  GalaxyStack,
  GalaxyExtensionStack,
  SolarSystemStack,
  SolarSystemExtensionStack,
} from '../src';

const app = new App();
const env = { account: 'account', region: 'region' };
const env2 = { account: 'account2', region: 'region2' };

const cosmos = new CosmosStack(app, 'Cos', { tld: 'com', cidr: '10.0.1.0/22', env });
const galaxy = new GalaxyStack(cosmos, 'Gal', { env });
const galaxyVpc = galaxy.AddSharedVpc();
const solarSystem = new SolarSystemStack(galaxy, 'Sys', { env, vpc: galaxyVpc });
const galaxy2 = new GalaxyStack(cosmos, 'Gal2', { env: env2 });
const solarSystem2 = new SolarSystemStack(galaxy2, 'Sys2', { env: env2 });

const cosmosExtension = new CosmosExtensionStack(app, 'Cos', { env });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys', { env });

const [
  galaxyStack,
  galaxy2Stack,
  solarSystemStack,
  solarSystem2Stack,
  solarSystemExtensionStack,
  cosmosLinkStack,
] = synthesizeStacks(
  galaxy,
  galaxy2,
  solarSystem,
  solarSystem2,
  solarSystemExtension,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cosmos.Link as any
);

describe('Solar-System', () => {
  test('should be a solar-system', () => {
    expect(solarSystemStack.name).toEqual('Core-Cos-Gal-Sys-SolarSystem');
    expect(solarSystemStack).toHaveResource('AWS::Route53::RecordSet');

    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Zone-Id' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Zone-Name', outputValue: 'sys.cos.com' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Zone-NameServers' });

    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Vpc-Id' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Vpc-AZs' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Vpc-IsolatedSubnetIds' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'Core-Gal-Sys-Vpc-IsolatedSubnetRouteTableIds' });

    expect(solarSystem2Stack).toHaveOutput({ exportName: 'Core-Gal2-Sys2-Vpc-Id' });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'Core-Gal2-Sys2-Vpc-AZs' });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'Core-Gal2-Sys2-Vpc-IsolatedSubnetIds' });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'Core-Gal2-Sys2-Vpc-IsolatedSubnetRouteTableIds' });
  });

  test('should create shared vpc in galaxy', () => {
    expect(galaxyStack).toHaveResource('AWS::EC2::VPC');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/24', env });
    const galaxy = new GalaxyStack(cosmos, 'Test', {});
    const solarSystem = new SolarSystemStack(galaxy, 'Test');
    expect({ account: solarSystem.account, region: solarSystem.region }).toEqual(env);
  });

  test('should throw error if no cidr found', () => {
    expect(() => {
      const app = new App();
      const cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
      const galaxy = new GalaxyStack(cosmos, 'Test');
      new SolarSystemStack(galaxy, 'Test');
    }).toThrowError('NetworkBuilder not found, please define cidr range here (SolarSystem: Test) or Galaxy or Cosmos.');
  });

  test('should have cird range', () => {
    let app = new App();
    let cosmos = new CosmosStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/22' });
    let galaxy = new GalaxyStack(cosmos, 'Test', {});
    let solarSystem = new SolarSystemStack(galaxy, 'Test');
    expect(solarSystem.NetworkBuilder?.addSubnet(28)).toEqual('10.0.1.0/28');
    expect(solarSystem.NetworkBuilder?.addSubnet(28)).toEqual('10.0.1.16/28');

    app = new App();
    cosmos = new CosmosStack(app, 'Test', { tld: 'com' });
    galaxy = new GalaxyStack(cosmos, 'Test', {});
    solarSystem = new SolarSystemStack(galaxy, 'Test', { cidr: '10.0.4.0/22' });
    expect(solarSystem.NetworkBuilder?.addSubnet(28)).toEqual('10.0.5.0/28');
  });

  test('should be cross account solar-system', () => {
    expect(solarSystem2Stack).not.toHaveResource('AWS::Route53::RecordSet');
    expect(cosmosLinkStack).toHaveResource('Custom::CrossAccountExports');
    expect(cosmosLinkStack).toHaveResource('AWS::Route53::RecordSet');
  });

  test('should not link zone', () => {
    const app = new App();
    const cosmos = new CosmosStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/22' });
    const galaxy = new GalaxyStack(cosmos, 'Test', {});
    const solarSystem = new SolarSystemStack(galaxy, 'Test', { zoneProps: { linkZone: false } });
    const [solarSystemStack] = synthesizeStacks(solarSystem);
    expect(solarSystemStack).not.toHaveResource('AWS::Route53::RecordSet');
  });

  test('should match snapshot', () => {
    expect(galaxyStack.template).toMatchSnapshot();
    expect(galaxy2Stack.template).toMatchSnapshot();
    expect(solarSystemStack.template).toMatchSnapshot();
    expect(solarSystem2Stack.template).toMatchSnapshot();
    expect(cosmosLinkStack.template).toMatchSnapshot();
  });
});

describe('Solar-System Extension', () => {
  test('should be a solar-system extension', () => {
    expect(solarSystemExtensionStack.name).toEqual('App-Cos-Gal-Sys-SolarSystem');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    const sys = new SolarSystemExtensionStack(galaxy, 'Test');
    expect({ account: sys.account, region: sys.region }).toEqual(env);
  });

  test('should match snapshot', () => {
    expect(solarSystemExtensionStack.template).toMatchSnapshot();
  });
});
