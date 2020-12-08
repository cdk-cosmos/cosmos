import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { synthesizeStacks } from '../../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
} from '../../src';

const env1 = { account: 'account1', region: 'region' };
const env2 = { account: 'account2', region: 'region' };

const app = new App();

const cosmos = new CosmosCoreStack(app, 'Cos', { env: env1, tld: 'cos.com' });
const coreDomain = cosmos.addDomain('CoreDomain', 'core.domain.com');
const galaxy = new GalaxyCoreStack(cosmos, 'Gal');
const solarSystem = new SolarSystemCoreStack(galaxy, 'Sys', { cidr: '10.0.0.0/24' });
solarSystem.addSubdomain('DevCoreSubdomain', coreDomain, 'dev');
const solarSystem2 = new SolarSystemCoreStack(galaxy, 'Sys2', { env: env2, cidr: '10.0.0.0/24' });
solarSystem2.addSubdomain('TstCoreSubdomain', coreDomain, 'tst');

const cosmosExtension = new CosmosExtensionStack(app, 'CosExt', { env: env1 });
const appDomain = cosmosExtension.addDomain('AppDomain', 'app.domain.com');
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal');
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys');
solarSystemExtension.addSubdomain('DevAppSubdomain', appDomain, 'dev');
const solarSystemExtension2 = new SolarSystemExtensionStack(galaxyExtension, 'Sys2', { env: env2 });
solarSystemExtension2.addSubdomain('TstAppSubdomain', appDomain, 'tst');

const [
  cosmosStack,
  cosmosLinkStack,
  solarSystemStack,
  solarSystem2Stack,
  cosmosExtensionStack,
  cosmosExtensionLinkStack,
  solarSystemExtensionStack,
  solarSystemExtension2Stack,
] = synthesizeStacks(
  cosmos,
  cosmos.link,
  solarSystem,
  solarSystem2,
  cosmosExtension,
  cosmosExtension.link,
  solarSystemExtension,
  solarSystemExtension2
);

describe('Domain Feature for Core', () => {
  test('sould have a domain at cosmos level', () => {
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreCoreDomainId' });
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreCoreDomainName', outputValue: 'core.domain.com' });
    expect(cosmosStack).toHaveOutput({ exportName: 'CoreCoreDomainNameServers' });

    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysDevCoreSubdomainId' });
    expect(solarSystemStack).toHaveOutput({
      exportName: 'CoreGalSysDevCoreSubdomainName',
      outputValue: 'dev.core.domain.com',
    });
    expect(solarSystemStack).toHaveOutput({ exportName: 'CoreGalSysDevCoreSubdomainNameServers' });

    expect(solarSystem2Stack).toHaveOutput({ exportName: 'CoreGalSys2TstCoreSubdomainId' });
    expect(solarSystem2Stack).toHaveOutput({
      exportName: 'CoreGalSys2TstCoreSubdomainName',
      outputValue: 'tst.core.domain.com',
    });
    expect(solarSystem2Stack).toHaveOutput({ exportName: 'CoreGalSys2TstCoreSubdomainNameServers' });

    expect(cosmosLinkStack).toHaveResource('Custom::CrossAccountExports');
    expect(cosmosLinkStack).toHaveResource('AWS::Route53::RecordSet');

    expect(cosmosStack).toMatchSnapshot();
    expect(cosmosLinkStack).toMatchSnapshot();
    expect(solarSystemStack).toMatchSnapshot();
    expect(solarSystem2Stack).toMatchSnapshot();
  });
});

describe('Domain Feature for Extension', () => {
  test('sould have a domain at cosmos level', () => {
    expect(cosmosExtensionStack).toHaveOutput({ exportName: 'AppCosExtAppDomainId' });
    expect(cosmosExtensionStack).toHaveOutput({ exportName: 'AppCosExtAppDomainName', outputValue: 'app.domain.com' });
    expect(cosmosExtensionStack).toHaveOutput({ exportName: 'AppCosExtAppDomainNameServers' });

    expect(solarSystemExtensionStack).toHaveOutput({ exportName: 'AppCosExtGalSysDevAppSubdomainId' });
    expect(solarSystemExtensionStack).toHaveOutput({
      exportName: 'AppCosExtGalSysDevAppSubdomainName',
      outputValue: 'dev.app.domain.com',
    });
    expect(solarSystemExtensionStack).toHaveOutput({ exportName: 'AppCosExtGalSysDevAppSubdomainNameServers' });

    expect(solarSystemExtension2Stack).toHaveOutput({ exportName: 'AppCosExtGalSys2TstAppSubdomainId' });
    expect(solarSystemExtension2Stack).toHaveOutput({
      exportName: 'AppCosExtGalSys2TstAppSubdomainName',
      outputValue: 'tst.app.domain.com',
    });
    expect(solarSystemExtension2Stack).toHaveOutput({ exportName: 'AppCosExtGalSys2TstAppSubdomainNameServers' });

    expect(cosmosExtensionLinkStack).toHaveResource('Custom::CrossAccountExports');
    expect(cosmosExtensionLinkStack).toHaveResource('AWS::Route53::RecordSet');

    expect(cosmosExtensionStack).toMatchSnapshot();
    expect(cosmosExtensionLinkStack).toMatchSnapshot();
    expect(solarSystemExtensionStack).toMatchSnapshot();
    expect(solarSystemExtension2Stack).toMatchSnapshot();
  });
});
