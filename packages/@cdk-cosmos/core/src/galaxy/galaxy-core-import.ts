import { ICosmosCore } from '../cosmos/cosmos-core-stack';
import { IGalaxyCore } from './galaxy-core-stack';
import { BaseConstructProps, BaseConstruct } from '../components/base';

export interface GalaxyCoreImportProps extends BaseConstructProps {}

export class GalaxyCoreImport extends BaseConstruct implements IGalaxyCore {
  readonly cosmos: ICosmosCore;

  constructor(cosmos: ICosmosCore, id: string, props?: GalaxyCoreImportProps) {
    super(cosmos, id, {
      type: 'Galaxy',
      ...props,
    });

    this.cosmos = cosmos;
  }
}
