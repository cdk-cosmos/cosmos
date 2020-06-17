import 'source-map-support/register';
import { MockCdkAsset } from '.';

Date.now = jest.fn(() => 1577836800000);

jest.mock('@aws-cdk/aws-s3-assets/lib/asset', () => ({
  Asset: MockCdkAsset,
}));
