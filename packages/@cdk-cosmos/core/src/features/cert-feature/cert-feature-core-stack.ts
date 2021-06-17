import * as path from 'path';
import * as fs from 'fs';
import { AccountPrincipal } from '@aws-cdk/aws-iam';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { Construct, Environment } from '@aws-cdk/core';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { ICosmosCore } from '../../cosmos';
import { GalaxyCoreStack } from '../../galaxy';

export interface ICertFeatureCore extends Construct {
  readonly cosmos: ICosmosCore;
  readonly bucket: IBucket;
}

export interface CertFeatureCoreStackProps extends BaseFeatureStackProps {
  certsDir: string;
  useGalaxyAccounts?: boolean;
  allowedAccounts?: Environment[];
}

export class CertFeatureCoreStack extends BaseFeatureStack implements ICertFeatureCore {
  readonly cosmos: ICosmosCore;
  readonly bucket: Bucket;
  private useGalaxyAccounts: boolean;
  private allowedAccounts: string[];

  constructor(cosmos: ICosmosCore, id: string, props: CertFeatureCoreStackProps) {
    super(cosmos, id, {
      description: 'Add Cert Bucket Features to the Cosmos',
      ...props,
    });

    const { allowedAccounts = [], useGalaxyAccounts = true, certsDir } = props;

    this.allowedAccounts = [];
    this.useGalaxyAccounts = useGalaxyAccounts;

    this.allowedAccounts.push(...allowedAccounts.filter((x) => x.account).map((x) => x.account as string));

    this.bucket = new Bucket(this, 'CertBucket', {
      bucketName: this.singletonId('Cert-Bucket', '-').toLowerCase(),
    });

    const certs = fs.readdirSync(certsDir);

    let combinedCerts = '';

    for (const cert of certs) {
      combinedCerts += fs.readFileSync(path.join(certsDir, cert), { encoding: 'utf-8' });
    }

    for (const fileType of ['.pem', '.crt']) {
      fs.writeFileSync(path.join(certsDir, `combined-certs${fileType}`), combinedCerts);
    }

    new BucketDeployment(this, 'DeployFiles', {
      sources: [Source.asset(certsDir)],
      destinationBucket: this.bucket,
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
