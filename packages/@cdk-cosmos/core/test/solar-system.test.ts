import '@aws-cdk/assert/jest';
import { App, Construct } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../src/test';
import { CfnRoute } from '@aws-cdk/aws-ec2';
import { ARecord, RecordTarget, CnameRecord } from '@aws-cdk/aws-route53';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
} from '../src';
import { SolarSystemCoreImport } from '../src/solar-system';

const app = new App();
const env = { account: 'account', region: 'region' };
const env2 = { account: 'account2', region: 'region' };

const cosmos = new CosmosCoreStack(app, 'Cos', { tld: 'cos.com', cidr: '10.0.1.0/22', env });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal', { env });
galaxy.addSharedVpc();
const solarSystem = new SolarSystemCoreStack(galaxy, 'Sys', { env, vpc: galaxy.sharedVpc?.vpc });
const galaxy2 = new GalaxyCoreStack(cosmos, 'Gal2', { env: env2 });
const solarSystem2 = new SolarSystemCoreStack(galaxy2, 'Sys2', { env: env2 });
new SolarSystemCoreStack(galaxy2, 'Sys3', { env: env2 });

const cosmosExtension = new CosmosExtensionStack(app, 'Test', { env });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys', { env });
// Test Resources for extension
new ARecord(solarSystemExtension, 'test', {
  zone: solarSystemExtension.portal.zone,
  target: RecordTarget.fromIpAddresses('1.1.1.1'),
});

const [
  galaxyStack,
  galaxySharedVpcStack,
  galaxy2Stack,
  solarSystemStack,
  solarSystem2Stack,
  solarSystemExtensionStack,
  cosmosLinkStack,
] = synthesizeStacks(
  galaxy,
  galaxy.sharedVpc,
  galaxy2,
  solarSystem,
  solarSystem2,
  solarSystemExtension,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cosmos.link as any
);

describe('Solar-System', () => {
  test('should be a solar system', () => {
    expect(solarSystem.stackName).toEqual('CoreCosGalSysSolarSystem');
    expect(solarSystemStack).toHaveResource('AWS::Route53::RecordSet');

    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneId' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneName', outputValue: 'sys.cos.com' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysZoneNameServers' });

    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysVpcId' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysVpcAZs' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysVpcIsolatedSubnetIds' });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysVpcIsolatedSubnetRouteTableIds' });

    expect(solarSystem2Stack).toHaveOutput({ exportName: 'CoreGal2Sys2VpcId' });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'CoreGal2Sys2VpcAZs' });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'CoreGal2Sys2VpcIsolatedSubnetIds' });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'CoreGal2Sys2VpcIsolatedSubnetRouteTableIds' });
  });

  test('should create shared vpc in galaxy', () => {
    expect(galaxySharedVpcStack).toHaveResource('AWS::EC2::VPC');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/24', env });
    const galaxy = new GalaxyCoreStack(cosmos, 'Test');
    const solarSystem = new SolarSystemCoreStack(galaxy, 'Test');
    expect({ account: solarSystem.account, region: solarSystem.region }).toEqual(env);
  });

  test('should throw error if no cidr found', () => {
    expect(() => {
      const app = new App();
      const cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com' });
      const galaxy = new GalaxyCoreStack(cosmos, 'Test');
      new SolarSystemCoreStack(galaxy, 'Test');
    }).toThrowError('Network Builder must be provided.');
  });

  test('should have cidr range', () => {
    let app = new App();
    let cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/22' });
    let galaxy = new GalaxyCoreStack(cosmos, 'Test');
    let solarSystem = new SolarSystemCoreStack(galaxy, 'Test');
    expect(solarSystem.networkBuilder?.addSubnet(28)).toEqual('10.0.1.0/28');
    expect(solarSystem.networkBuilder?.addSubnet(28)).toEqual('10.0.1.16/28');

    app = new App();
    cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com' });
    galaxy = new GalaxyCoreStack(cosmos, 'Test');
    solarSystem = new SolarSystemCoreStack(galaxy, 'Test', { cidr: '10.0.4.0/22' });
    expect(solarSystem.networkBuilder?.addSubnet(28)).toEqual('10.0.5.0/28');
  });

  test('should be cross account solar system', () => {
    expect(solarSystem2Stack).not.toHaveResource('AWS::Route53::RecordSet');
    expect(cosmosLinkStack).toHaveResource('Custom::CrossAccountExports');
    expect(cosmosLinkStack).toHaveResource('AWS::Route53::RecordSet');
  });

  test('should not link zone', () => {
    const app = new App();
    const cosmos = new CosmosCoreStack(app, 'Test', { tld: 'com', cidr: '10.0.0.0/22' });
    const galaxy = new GalaxyCoreStack(cosmos, 'Test');
    const solarSystem = new SolarSystemCoreStack(galaxy, 'Test', { zoneProps: { linkZone: false } });
    const [solarSystemStack] = synthesizeStacks(solarSystem);
    expect(solarSystemStack).not.toHaveResource('AWS::Route53::RecordSet');
  });

  test('should match snapshot', () => {
    expect(galaxyStack).toMatchSnapshot();
    expect(galaxySharedVpcStack).toMatchSnapshot();
    expect(galaxy2Stack).toMatchSnapshot();
    expect(solarSystemStack).toMatchSnapshot();
    expect(solarSystem2Stack).toMatchSnapshot();
    expect(cosmosLinkStack).toMatchSnapshot();
  });
});

describe('SolarSystem Extension', () => {
  test('should be a solar system extension', () => {
    expect(solarSystemExtension.stackName).toEqual('AppTestGalSysSolarSystem');
  });

  test('should inherit env', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    const sys = new SolarSystemExtensionStack(galaxy, 'Test');
    expect({ account: sys.account, region: sys.region }).toEqual(env);
  });

  test('should restore multiple subnet groups', () => {
    const createApp = (): void => {
      const app = new App();
      const cosmos = new CosmosExtensionStack(app, 'Test', { env });
      const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
      new SolarSystemExtensionStack(galaxy, 'Test', {
        portalProps: {
          vpcProps: {
            isolatedSubnetNames: ['App', 'Redis'],
          },
        },
      });
    };

    expect(createApp).not.toThrow();
  });

  test('should restore multiple subnet groups and create route', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    const sys = new SolarSystemExtensionStack(galaxy, 'Test', {
      portalProps: {
        vpcProps: {
          isolatedSubnetNames: ['App', 'Redis'],
        },
      },
    });
    new CfnRoute(sys, 'TestRoute', {
      routeTableId: sys.portal.vpc.selectSubnets({ subnetGroupName: 'Redis' }).subnets[0].routeTable.routeTableId,
      destinationCidrBlock: '10.0.0.0/16',
    });

    const [stack] = synthesizeStacks(sys);
    expect(stack).toMatchSnapshot();
  });

  test('should be able to target the same SolarSystem from multiple Stacks', () => {
    const app = new App();
    const cosmos = new CosmosExtensionStack(app, 'Test', { env });
    const galaxy = new GalaxyExtensionStack(cosmos, 'Test');
    const portal = new SolarSystemCoreImport(galaxy.portal, 'Test', { galaxy: galaxy.portal });
    const sys = new SolarSystemExtensionStack(galaxy, 'Test', { portal });
    const sys2 = new SolarSystemExtensionStack(galaxy, 'Test2', { portal });
    new ARecord(sys, 'Test', {
      zone: sys.portal.zone,
      target: RecordTarget.fromIpAddresses('1.1.1.1'),
    });
    new ARecord(sys2, 'Test', {
      zone: sys2.portal.zone,
      target: RecordTarget.fromIpAddresses('1.1.1.1'),
    });

    const [stack1, stack2] = synthesizeStacks(sys, sys2);
    expect(stack1).toMatchSnapshot();
    expect(stack2).toMatchSnapshot();
  });

  test('should allow resourced to be created in portal', () => {
    const app = new App();
    const cosmosExtension = new CosmosExtensionStack(app, 'Test', { env });
    const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal', { env });
    const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys', { env });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new CnameRecord((solarSystemExtension.portal.zone as any) as Construct, 'Test', {
      zone: solarSystemExtension.portal.zone,
      recordName: 'test',
      domainName: 'test',
    });
    const [solarSystemExtensionStack] = synthesizeStacks(solarSystemExtension);
    expect(solarSystemExtensionStack).toMatchSnapshot();
  });

  test('should match snapshot', () => {
    expect(solarSystemExtensionStack).toMatchSnapshot();
  });
});
