import { Construct, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { SecureBucket } from '@cosmos-building-blocks/service';

export class CDKToolKit extends Stack {
  readonly bucket: SecureBucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, {
      description:
        'The CDK Tool Kit Stack. It was created by `@cosmos-building-blocks` and manages resources necessary for managing your Cloud Applications with AWS CDK.',
      ...props,
      stackName: 'CDKToolkit',
    });

    this.bucket = new SecureBucket(this, 'StagingBucket');
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
