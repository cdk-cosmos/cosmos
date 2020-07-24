import { Construct } from '@aws-cdk/core';
import { Bucket, BucketEncryption, BucketProps, BucketAccessControl } from '@aws-cdk/aws-s3';
import { PolicyStatement, Effect, AnyPrincipal } from '@aws-cdk/aws-iam';

export class SecureBucket extends Bucket {
  constructor(scope: Construct, id: string, props?: BucketProps) {
    super(scope, id, {
      encryption: BucketEncryption.S3_MANAGED,
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      serverAccessLogsPrefix: 'BucketAccessLogs/',
      ...props,
    });
    const policyStatement = new PolicyStatement({
      actions: ['s3:*'],
      principals: [new AnyPrincipal()],
      resources: [`${this.bucketArn}/*`],
      effect: Effect.DENY,
      sid: 'ForceSSLOnly',
    });
    policyStatement.addCondition('Bool', { 'aws:SecureTransport': false });
    super.addToResourcePolicy(policyStatement);
  }
}
