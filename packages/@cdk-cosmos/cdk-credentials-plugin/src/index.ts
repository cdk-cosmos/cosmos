import { Plugin, PluginHost, CredentialProviderSource } from 'aws-cdk';
import { Credentials, ChainableTemporaryCredentials, HTTPOptions } from 'aws-sdk';

const {
  CDK_COSMOS_CREDENTIALS_PLUGIN_DISABLE = 'false',
  CDK_COSMOS_CREDENTIALS_PLUGIN_ROLE = 'CoreCdkCrossAccountRole',
} = process.env;

export class CdkCosmosCredentialsPlugin implements Plugin {
  public readonly version = '1';

  public init(host: PluginHost): void {
    host.registerCredentialProviderSource(new CdkCosmosCredentialsProvider());
  }
}

module.exports = new CdkCosmosCredentialsPlugin();

export class CdkCosmosCredentialsProvider implements CredentialProviderSource {
  readonly name = 'cdk-cosmos-credentials-plugin';
  private readonly cache: { [key: string]: ChainableTemporaryCredentials | undefined } = {};

  async isAvailable(): Promise<boolean> {
    if (CDK_COSMOS_CREDENTIALS_PLUGIN_DISABLE === 'true') return false;
    return true;
  }

  async canProvideCredentials(accountId: string): Promise<boolean> {
    if (this.cache[accountId] && !this.cache[accountId]?.expired) return true;

    try {
      const cred = new ChainableTemporaryCredentials({
        params: {
          RoleArn: `arn:aws:iam::${accountId}:role/${CDK_COSMOS_CREDENTIALS_PLUGIN_ROLE}`,
          RoleSessionName: 'cdk-cosmos-credentials-provider',
        },
        stsConfig: {
          httpOptions: getHttpOptions(),
        },
      });
      await cred.getPromise();

      this.cache[accountId] = cred;
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }

  async getProvider(accountId: string): Promise<Credentials> {
    const creds = this.cache[accountId];
    if (!creds) throw new Error('Credentials Not Found.');
    return creds;
  }
}

const getHttpOptions = (): HTTPOptions => {
  const options: HTTPOptions = {
    connectTimeout: 30000,
  };

  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (httpsProxy) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxy = require('proxy-agent');
    options.agent = proxy(httpsProxy);
  }

  return options;
};
