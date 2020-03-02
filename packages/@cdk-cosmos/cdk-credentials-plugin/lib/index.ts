import { Plugin, PluginHost, CredentialProviderSource, Mode, SDK } from 'aws-cdk';
import { Credentials, ChainableTemporaryCredentials } from 'aws-sdk';

// Init AWS-SDK with common settings like proxy
// new SDK();

export class CdkCredentialsPlugin implements Plugin {
  public readonly version = '1';

  constructor() {}

  public init(host: PluginHost): void {
    host.registerCredentialProviderSource(new CdkCredentialsProvider());
  }
}

export class CdkCredentialsProvider implements CredentialProviderSource {
  name: string = '@carnivalofthecosmos/cdk-credentials-plugin';
  cache: { [key: string]: ChainableTemporaryCredentials } = {};

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async canProvideCredentials(accountId: string): Promise<boolean> {
    try {
      // console.log(`Checking if plugin can provide a Credential for ${accountId}`);

      const cred = new ChainableTemporaryCredentials({
        params: {
          RoleArn: `arn:aws:iam::${accountId}:role/Core-CdkCrossAccount-Role`,
          RoleSessionName: 'cdk-credentials-provider',
        },
      });
      await this.getCredentials(cred);
      this.cache[accountId] = cred;
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }

  async getProvider(accountId: string, mode: Mode): Promise<Credentials> {
    // console.log(`Providing Credential for ${accountId}`);

    return this.cache[accountId];
  }

  async getCredentials(cred: Credentials) {
    return new Promise<void>((res, rej) => {
      const timeout = setTimeout(() => {
        rej(new Error('TimeOutError'));
      }, 10000);
      cred.get(error => {
        clearTimeout(timeout);
        if (error) rej(error);
        res();
      });
    });
  }
}

module.exports = new CdkCredentialsPlugin();
