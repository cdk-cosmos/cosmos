import { Construct } from '@aws-cdk/core';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';
import { IGalaxyCore } from './galaxy-core-stack';
import { BaseConstructProps, BaseConstruct } from '../components/base';

export interface GalaxyCoreImportProps extends BaseConstructProps {
  cosmos: ICosmosCore;
}

export class GalaxyCoreImport extends BaseConstruct implements IGalaxyCore {
  readonly cosmos: ICosmosCore;

  constructor(scope: Construct, id: string, props: GalaxyCoreImportProps) {
    super(scope, id, {
      type: 'Galaxy',
      partition: 'Core',
      ...props,
    });

    const { cosmos } = props;

    this.cosmos = cosmos;
  }
}
