import * as fs from 'fs';
import { Construct, Stack, StackProps, CfnOutput, Fn, Environment } from '@aws-cdk/core';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';

export class BootstrapStack extends Stack {
  readonly bucket: Bucket;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, {
      description:
        'The CDK Toolkit Stack. It was created by `@cosmos-building-blocks` and manages resources necessary for managing your Cloud Applications with AWS CDK.',
      ...props,
      stackName: 'CDKToolkit',
    });

    this.bucket = new Bucket(this, 'StagingBucket', {
      encryption: BucketEncryption.S3_MANAGED,
    });
    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'The name of the S3 bucket owned by the CDK toolkit stack',
    });

    new CfnOutput(this, 'BucketDomainName', {
      value: this.bucket.bucketDomainName,
      description: 'The domain name of the S3 bucket owned by the CDK toolkit stack',
    });
  }
}
