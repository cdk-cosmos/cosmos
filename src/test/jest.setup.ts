/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import 'source-map-support/register';
import { CONTEXT_ENV, NEW_STYLE_STACK_SYNTHESIS_CONTEXT, ENABLE_DIFF_NO_FAIL_CONTEXT } from '@aws-cdk/cx-api';

Date.now = jest.fn(() => 1577836800000);

jest.mock('@aws-cdk/core/lib/asset-staging', () => ({
  ...jest.requireActual<object>('@aws-cdk/core/lib/asset-staging'),
  AssetStaging: jest.fn().mockImplementation(() => ({
    stagedPath: 'stagedPath',
    sourcePath: 'sourcePath',
    sourceHash: 'sourceHash',
    assetHash: 'assetHash',
  })),
}));

jest.mock('@aws-cdk/aws-s3-assets/lib/asset', () => ({
  ...jest.requireActual<object>('@aws-cdk/aws-s3-assets/lib/asset'),
  Asset: jest.fn().mockImplementation(() => ({
    s3BucketName: 's3BucketName',
    s3ObjectKey: 's3ObjectKey',
    s3Url: 's3Url',
    isZipArchive: true,
    addResourceMetadata() {},
  })),
}));

process.env[CONTEXT_ENV] = JSON.stringify({
  [NEW_STYLE_STACK_SYNTHESIS_CONTEXT]: true,
  [ENABLE_DIFF_NO_FAIL_CONTEXT]: true,
});
