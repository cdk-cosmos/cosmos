import { Construct } from '@aws-cdk/core';
import { ICosmosCore } from './cosmos-core-stack';
import { BaseStack, BaseStackProps } from '../components/base';

export interface ICosmosCoreLink extends Construct {
  cosmos: ICosmosCore;
}

export class CosmosCoreLinkStack extends BaseStack implements ICosmosCoreLink {
  readonly cosmos: ICosmosCore;

  constructor(cosmos: ICosmosCore, props?: BaseStackProps) {
    super(cosmos, 'Link', {
      description: 'Cosmos Link: Resources to link the Cosmos, like Route53 zone delegation',
      ...props,
      type: 'Link',
    });

    this.cosmos = cosmos;
  }
}
