import { Construct } from '@aws-cdk/core';
import { Bucket, BucketEncryption, BucketProps } from '@aws-cdk/aws-s3';
import { PolicyStatement, Effect, AnyPrincipal } from '@aws-cdk/aws-iam';

export class SecureBucket extends Construct {
  readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props?: BucketProps) {
    super(scope, id);
    this.bucket = new Bucket(this, id, {
      encryption: BucketEncryption.S3_MANAGED,
      serverAccessLogsPrefix: 'BucketAccessLogs',
      ...props,
    });
    const policyStatement = new PolicyStatement({
      actions: ['s3:*'],
      principals: [new AnyPrincipal()],
      resources: [`${this.bucket.bucketArn}/*`],
      effect: Effect.DENY,
      sid: 'ForceSSLOnly',
    });
    policyStatement.addCondition('Bool', { 'aws:SecureTransport': false });
    this.bucket.addToResourcePolicy(policyStatement);
  }
}
