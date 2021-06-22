import '@aws-cdk/assert/jest';
import * as path from 'path';
import { synthesizeStacks } from '../../../../../src/test';
import { App } from '@aws-cdk/core';
import { CosmosCoreStack, CosmosExtensionStack, GalaxyCoreStack } from '../../src';

const env1 = { account: 'account1', region: 'region' };
const env2 = { account: 'account2', region: 'region' };

const app = new App();
const cosmos = new CosmosCoreStack(app, 'Cos', {
  tld: 'cos.com',
  env: env1,
});
cosmos.addCert({ certsDir: path.join(__dirname, './certs') });

new GalaxyCoreStack(cosmos, 'Gal1', { cidr: '10.0.1.0/22' });
new GalaxyCoreStack(cosmos, 'Gal2', { cidr: '10.0.2.0/22', env: env2 });

const cosmosExtension = new CosmosExtensionStack(app, 'Test');
cosmosExtension.portal.addCert();
const [cosmosStack, certStack, cosmosExtensionStack] = synthesizeStacks(cosmos, cosmos.cert, cosmosExtension);

describe('Cert Feature', () => {
  test('should match snapshot', () => {
    expect(cosmosStack).toMatchSnapshot({
      Outputs: {
        CoreLibVersion: {
          Value: expect.any(String),
        },
      },
    });
    expect(certStack).toMatchSnapshot();
  });
});

describe('Cert Feature Extension', () => {
  test('should match snapshot', () => {
    expect(cosmosExtensionStack).toMatchSnapshot({
      Outputs: {
        AppLibVersion: {
          Value: expect.any(String),
        },
      },
    });
  });
});
