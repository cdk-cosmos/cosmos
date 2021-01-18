import '@aws-cdk/assert/jest';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { App } from '@aws-cdk/core';
import { StandardPipeline } from '@cosmos-building-blocks/pipeline';
import {
  GithubEnterpriseSourceAction,
  GithubEnterpriseSourceProvider,
} from '@cosmos-building-blocks/pipeline/lib/source';
import { synthesizeStacks } from '../../../../../src/test';
import {
  CosmosCoreStack,
  CosmosExtensionStack,
  GalaxyCoreStack,
  GalaxyExtensionStack,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
} from '../../src';

const env1 = { account: 'account1', region: 'region1' };

const app = new App();

const cosmos = new CosmosCoreStack(app, 'Cos', { env: env1, tld: 'cos.com' });
const galaxy = new GalaxyCoreStack(cosmos, 'Gal');
const solarSystem = new SolarSystemCoreStack(galaxy, 'Sys', { cidr: '10.0.0.0/24' });
const github = solarSystem.addGithubEnterprise({
  endpoint: 'https://test.com',
});

const cosmosExtension = new CosmosExtensionStack(app, 'CosExt', { env: env1 });
const galaxyExtension = new GalaxyExtensionStack(cosmosExtension, 'Gal');
const solarSystemExtension = new SolarSystemExtensionStack(galaxyExtension, 'Sys');
const githubExtension = solarSystemExtension.portal.addGithubEnterprise();
new StandardPipeline(solarSystemExtension, 'Test', {
  codeSource: new GithubEnterpriseSourceProvider({
    connection: githubExtension.connection,
    repo: 'https://test.com/test/test.git',
    branch: 'master',
  }),
});

const [solarSystemStack, githubStack, solarSystemExtensionStack] = synthesizeStacks(
  solarSystem,
  github,
  solarSystemExtension
);

describe('Github Enterprise Feature for SolarSystem', () => {
  test('should have a github nested stack', () => {
    expect(solarSystemStack).toMatchSnapshot();
    expect(githubStack).toMatchSnapshot();
  });
});

describe('Github Enterprise for SolarSystemExtension', () => {
  test('should have a github nested stack', () => {
    expect(solarSystemExtensionStack).toMatchSnapshot();
  });
});
