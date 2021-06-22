import * as path from 'path';
import * as fs from 'fs';
import { AccountPrincipal } from '@aws-cdk/aws-iam';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { CfnOutput, Construct, Environment } from '@aws-cdk/core';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { CosmosCoreStack, ICosmosCore } from '../../cosmos';
import { GalaxyCoreStack } from '../../galaxy';
import { RemoteBucket } from '../../components/remote';

export interface ICertFeatureCore extends Construct {
  readonly cosmos: ICosmosCore;
  readonly bucket: IBucket;
  readonly combinedCrt: string;
  readonly combinedPem: string;
}

export interface CertFeatureCoreStackProps extends BaseFeatureStackProps {
  certsDir: string;
  useGalaxyAccounts?: boolean;
  allowedAccounts?: Environment[];
}

export class CertFeatureCoreStack extends BaseFeatureStack implements ICertFeatureCore {
  readonly cosmos: ICosmosCore;
  readonly bucket: Bucket;
  readonly combinedCrt: string;
  readonly combinedPem: string;
  private useGalaxyAccounts: boolean;
  private allowedAccounts: string[];

  constructor(cosmos: ICosmosCore, id: string, props: CertFeatureCoreStackProps) {
    super(cosmos, id, {
      description: 'Add Cert Bucket Features to the Cosmos',
      ...props,
    });

    this.cosmos = cosmos;

    const { allowedAccounts = [], useGalaxyAccounts = true, certsDir } = props;

    this.allowedAccounts = [];
    this.useGalaxyAccounts = useGalaxyAccounts;

    this.allowedAccounts.push(...allowedAccounts.filter((x) => x.account).map((x) => x.account as string));

    this.bucket = new Bucket(this, 'CertBucket', {
      bucketName: this.singletonId('Cert-Bucket', '-').toLowerCase(),
    });

    const certs = fs.readdirSync(certsDir).filter((x) => !x.startsWith('combined-certs'));

    let combinedCerts = '';

    for (const cert of certs) {
      combinedCerts += fs.readFileSync(path.join(certsDir, cert), { encoding: 'utf-8' });
    }

    const combinedPem = 'combined-certs.pem';
    const combinedCrt = 'combined-certs.crt';

    for (const fileName of [combinedPem, combinedCrt]) {
      fs.writeFileSync(path.join(certsDir, fileName), combinedCerts);
    }

    new BucketDeployment(this, 'DeployFiles', {
      sources: [Source.asset(certsDir)],
      destinationBucket: this.bucket,
    });

    this.combinedPem = this.bucket.urlForObject(combinedPem);
    this.combinedCrt = this.bucket.urlForObject(combinedCrt);

    new RemoteBucket(this.bucket, this.singletonId('CertBucket'));
    new CfnOutput(this, 'CombinedCertPem', {
      exportName: this.singletonId('CombinedCertPem'),
      value: this.combinedPem,
    });
    new CfnOutput(this, 'CombinedCertCrt', {
      exportName: this.singletonId('CombinedCertCrt'),
      value: this.combinedCrt,
    });
  }

  protected onPrepare() {
    if (this.useGalaxyAccounts) {
      const galaxies = this.cosmos.node.children.filter((x) => GalaxyCoreStack.isGalaxyCore(x)) as GalaxyCoreStack[];
      galaxies.forEach((x) => this.allowedAccounts.push(x.account));
    }

    this.allowedAccounts
      .filter((x, i, self) => self.indexOf(x) === i)
      .forEach((x) => this.bucket.grantRead(new AccountPrincipal(x)));
  }
}

declare module '../../cosmos/cosmos-core-stack' {
  export interface ICosmosCore {
    readonly cert?: ICertFeatureCore;
  }

  interface CosmosCoreStack {
    cert?: CertFeatureCoreStack;
    addCert(props: CertFeatureCoreStackProps): CertFeatureCoreStack;
  }
}

CosmosCoreStack.prototype.addCert = function (props: CertFeatureCoreStackProps): CertFeatureCoreStack {
  this.cert = new CertFeatureCoreStack(this, 'Cert', props);
  return this.cert;
};
