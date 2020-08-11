import { CoreVpcProps, ICoreVpc, CoreVpc } from '../../components/core-vpc';
import { BaseNestedStack, BaseNestedStackProps } from '../../components/base';
import { IGalaxyCore, GalaxyCoreStack } from '../../galaxy/galaxy-core-stack';
import { Tag } from '@aws-cdk/core';

export interface ISharedVpc {
  readonly vpc: ICoreVpc;
}

export interface SharedVpcCoreStackProps extends BaseNestedStackProps {
  vpcProps?: Partial<CoreVpcProps>;
}

export class SharedVpcCoreStack extends BaseNestedStack implements ISharedVpc {
  readonly vpc: CoreVpc;

  constructor(scope: IGalaxyCore, id: string, props?: SharedVpcCoreStackProps) {
    super(scope, id, {
      ...props,
      type: 'Feature',
    });

    const { vpcProps } = props || {};

    const networkBuilder = this.networkBuilder || vpcProps?.networkBuilder;
    if (!networkBuilder) throw this.node.addError('Network Builder must be provided');

    this.vpc = new CoreVpc(this, 'Vpc', {
      ...vpcProps,
      networkBuilder,
    });

    Tag.add(this, 'cosmos:feature', this.node.id);
  }
}

declare module '../../galaxy/galaxy-core-stack' {
  export interface IGalaxyCore {
    readonly sharedVpc?: ISharedVpc;
  }
  interface GalaxyCoreStack {
    sharedVpc?: SharedVpcCoreStack;
    addSharedVpc(props?: SharedVpcCoreStackProps): SharedVpcCoreStack;
  }
}

GalaxyCoreStack.prototype.addSharedVpc = function(props?: SharedVpcCoreStackProps): SharedVpcCoreStack {
  this.sharedVpc = new SharedVpcCoreStack(this, 'SharedVpc', props);
  return this.sharedVpc;
};
