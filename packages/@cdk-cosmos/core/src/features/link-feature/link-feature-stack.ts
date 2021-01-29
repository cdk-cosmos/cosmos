import { Construct } from '@aws-cdk/core';
import { BaseStack, BaseStackProps } from '../../components/base';
import { CosmosCoreStack } from '../../cosmos/cosmos-core-stack';
import { CosmosExtensionStack } from '../../cosmos/cosmos-extension-stack';

export interface ILinkFeature<T extends Construct = Construct> extends Construct {
  cosmos: T;
}

export interface LinkFeatureStackProps extends BaseStackProps {}

export class LinkFeatureStack<T extends Construct = Construct> extends BaseStack implements ILinkFeature<T> {
  readonly cosmos: T;
  readonly serviceToken: string;
  readonly serviceTokenRoleArn: string;

  constructor(cosmos: T, props: LinkFeatureStackProps) {
    super(cosmos, 'Link', {
      description: 'Link Feature: Resources to link the Cosmos, like Route53 zone delegation',
      ...props,
      type: 'Link',
    });

    this.cosmos = cosmos;
  }
}

declare module '../../cosmos/cosmos-core-stack' {
  export interface ICosmosCore {
    readonly link?: ILinkFeature<ICosmosCore>;
  }
  export interface CosmosCoreStack {
    link: LinkFeatureStack<CosmosCoreStack>;
  }
}

declare module '../../cosmos/cosmos-extension-stack' {
  export interface ICosmosExtension {
    readonly link?: ILinkFeature<ICosmosExtension>;
  }
  export interface CosmosExtensionStack {
    link: LinkFeatureStack<CosmosExtensionStack>;
  }
}

const linkGetter = {
  get(this: any): LinkFeatureStack {
    if (!this._link) {
      this._link = new LinkFeatureStack(this, {});
    }
    return this._link;
  },
};

Object.defineProperty(CosmosCoreStack.prototype, 'link', linkGetter);
Object.defineProperty(CosmosExtensionStack.prototype, 'link', linkGetter);
