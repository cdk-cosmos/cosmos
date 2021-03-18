import { Construct, Stack } from '@aws-cdk/core';
import { Config } from '@cosmos-building-blocks/common';
import { isCrossAccount } from '@cosmos-building-blocks/common/lib/utils';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';
import { IGalaxyCore } from './galaxy-core-stack';
import { BaseConstructProps, BaseConstruct } from '../components/base';

export interface GalaxyCoreImportProps extends BaseConstructProps {
  cosmos: ICosmosCore;
}

export class GalaxyCoreImport extends BaseConstruct implements IGalaxyCore {
  readonly config: Config;
  readonly cosmos: ICosmosCore;
  readonly cdkCrossAccountRoleStaticArn?: string;

  constructor(scope: Construct, id: string, props: GalaxyCoreImportProps) {
    super(scope, id, {
      type: 'Galaxy',
      partition: 'Core',
      ...props,
    });

    const { cosmos } = props;

    this.cosmos = cosmos;
    this.config = new Config(this, 'Config', id, this.cosmos.config);

    if (isCrossAccount(this, this.cosmos)) {
      const CdkCrossAccountRoleName = this.cosmos.singletonId('CdkCrossAccountRole');

      this.cdkCrossAccountRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${CdkCrossAccountRoleName}`;
    }
  }
}
