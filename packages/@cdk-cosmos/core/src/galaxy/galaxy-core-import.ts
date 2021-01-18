import { Construct, Stack } from '@aws-cdk/core';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';
import { IGalaxyCore } from './galaxy-core-stack';
import { BaseConstructProps, BaseConstruct } from '../components/base';
import { isCrossAccount } from '../helpers/utils';

export interface GalaxyCoreImportProps extends BaseConstructProps {
  cosmos: ICosmosCore;
}

export class GalaxyCoreImport extends BaseConstruct implements IGalaxyCore {
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

    if (isCrossAccount(this, this.cosmos)) {
      const CdkCrossAccountRoleName = this.cosmos.singletonId('CdkCrossAccountRole');

      this.cdkCrossAccountRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${CdkCrossAccountRoleName}`;
    }
  }
}
