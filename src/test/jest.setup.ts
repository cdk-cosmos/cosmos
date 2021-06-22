/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import 'source-map-support/register';
import { CONTEXT_ENV, ENABLE_DIFF_NO_FAIL_CONTEXT } from '@aws-cdk/cx-api';

Date.now = jest.fn(() => 1577836800000);

jest.mock('@aws-cdk/core/lib/asset-staging', () => ({
  ...jest.requireActual<object>('@aws-cdk/core/lib/asset-staging'),
  AssetStaging: jest.fn().mockImplementation(() => ({
    stageMocked: true,
    stagedPath: 'stagedPath',
    sourcePath: 'sourcePath',
    sourceHash: 'sourceHash',
    assetHash: 'assetHash',
    relativeStagedPath: () => 'relativeStagedPath',
  })),
}));

jest.mock('@aws-cdk/aws-s3-assets/lib/asset', () => ({
  ...jest.requireActual<object>('@aws-cdk/aws-s3-assets/lib/asset'),
  Asset: jest.fn().mockImplementation(() => ({
    assetMocked: true,
    s3BucketName: 's3BucketName',
    s3ObjectKey: 's3ObjectKey',
    s3Url: 's3Url',
    isZipArchive: true,
    bucket: { bucketName: 's3BucketName' },
    addResourceMetadata() {},
    grantRead() {},
  })),
}));

process.env[CONTEXT_ENV] = JSON.stringify({
  [ENABLE_DIFF_NO_FAIL_CONTEXT]: true,
});
