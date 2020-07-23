/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Construct } from '@aws-cdk/core';
import { IBucket } from '@aws-cdk/aws-s3';
import { Asset } from '@aws-cdk/aws-s3-assets';

export const mockProxy: <T extends object = {}>(obj?: T) => T = (obj = {} as any) =>
  new Proxy(obj, {
    get: (target, prop, receiver): any => {
      const val = Reflect.get(target, prop, receiver);
      if (val !== undefined) return val;

      return `mock-${prop.toString()}`;
    },
  });

export class MockCdkAsset extends Construct implements Asset {
  s3BucketName: string;
  s3ObjectKey: string;
  s3Url: string;
  assetPath: string;
  sourceHash: string;
  httpUrl: string;
  s3ObjectUrl: string;
  assetHash: string;
  isZipArchive = true;
  bucket: IBucket = mockProxy() as IBucket;

  constructor(scope: any, id: any) {
    super(scope, id);
    return mockProxy(this);
  }

  addResourceMetadata() {}
  grantRead() {}
}
