import { Construct } from '@aws-cdk/core';
import { Bucket, BucketEncryption, BucketProps } from '@aws-cdk/aws-s3';
import { PolicyStatement, Effect, AccountPrincipal, AnyPrincipal } from '@aws-cdk/aws-iam';

export interface SecureBucketProps extends BucketProps {
  prefix?: string;
}

export class SecureBucket extends Construct {
  readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props?: SecureBucketProps) {
    super(scope, id);
    const bucket = new Bucket(this, id, {
      encryption: BucketEncryption.S3_MANAGED,
      serverAccessLogsPrefix: 'BucketAccessLogs',
      ...props,
    });
    const policyStatement = new PolicyStatement({
      actions: ['s3:*'],
      principals: [new AnyPrincipal()],
      effect: Effect.DENY,
      sid: 'ForceSSLOnly',
    });
    policyStatement.addCondition('Bool', { 'aws:SecureTransport': false });
    bucket.addToResourcePolicy(policyStatement);
  }
}
