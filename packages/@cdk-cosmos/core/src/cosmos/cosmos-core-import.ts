import { Construct, Stack, Fn } from '@aws-cdk/core';
import { IHostedZone } from '@aws-cdk/aws-route53';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { IFunction } from '@aws-cdk/aws-lambda';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';
import { BaseConstruct, BaseConstructProps } from '../components/base';
import { RemoteZone, RemoteCodeRepo, RemoteFunction } from '../helpers/remote';

export interface CosmosCoreImportProps extends BaseConstructProps {}

export class CosmosCoreImport extends BaseConstruct implements ICosmosCore {
  readonly name: string;
  readonly libVersion: string;
  readonly cdkRepo: IRepository;
  readonly rootZone: IHostedZone;
  readonly cdkMasterRoleStaticArn: string;
  readonly crossAccountExportsFn: IFunction;

  constructor(scope: Construct, id: string, props?: CosmosCoreImportProps) {
    super(scope, id, {
      type: 'Cosmos',
      partition: 'Core',
      ...props,
    });

    this.libVersion = Fn.importValue(this.singletonId('LibVersion'));
    this.cdkRepo = RemoteCodeRepo.import(this, 'CdkRepo', this.singletonId('CdkRepo'));
    this.rootZone = RemoteZone.import(this, 'RootZone', this.singletonId('RootZone'));
    this.crossAccountExportsFn = RemoteFunction.import(
      this,
      'CrossAccountExportsFn',
      this.singletonId('CrossAccountExportsFn')
    );
    this.cdkMasterRoleStaticArn = `arn:aws:iam::${Stack.of(scope).account}:role/${this.singletonId('CdkMasterRole')}`;
  }
}
