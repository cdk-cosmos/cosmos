import { IBucket } from '@aws-cdk/aws-s3';
import { Construct, Fn } from '@aws-cdk/core';
import { BaseFeatureConstruct, BaseFeatureConstructProps } from '../../components/base';
import { RemoteBucket } from '../../components/remote';
import { CosmosCoreImport, ICosmosCore } from '../../cosmos';
import { ICertFeatureCore } from './cert-feature-core-stack';

export interface CertFeatureCoreImportProps extends BaseFeatureConstructProps {
  cosmos: ICosmosCore;
}

export class CertFeatureCoreImport extends BaseFeatureConstruct implements ICertFeatureCore {
  readonly cosmos: ICosmosCore;
  readonly bucket: IBucket;
  readonly combinedCrt: string;
  readonly combinedPem: string;

  constructor(scope: Construct, id: string, props: CertFeatureCoreImportProps) {
    super(scope, id, props);

    const { cosmos } = props;

    this.cosmos = cosmos;

    this.bucket = RemoteBucket.import(this, 'CertBucket', this.singletonId('CertBucket'));
    this.combinedPem = Fn.importValue(this.singletonId('CombinedCertPem'));
    this.combinedCrt = Fn.importValue(this.singletonId('CombinedCertCrt'));
  }
}

declare module '../../cosmos/cosmos-core-import' {
  interface CosmosCoreImport {
    cert?: CertFeatureCoreImport;
    addCert(props?: Partial<CertFeatureCoreImportProps>): CertFeatureCoreImport;
  }
}

CosmosCoreImport.prototype.addCert = function (props?: Partial<CertFeatureCoreImportProps>): CertFeatureCoreImport {
  this.cert = new CertFeatureCoreImport(this, 'Cert', {
    cosmos: this,
    ...props,
  });
  return this.cert;
};
