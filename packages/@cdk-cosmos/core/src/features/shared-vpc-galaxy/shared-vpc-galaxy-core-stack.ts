import { CoreVpcProps, ICoreVpc, CoreVpc } from '../../components/core-vpc';
import { BaseNestedStack, BaseNestedStackProps } from '../../components/base';
import { IGalaxyCore, GalaxyCoreStack } from '../../galaxy/galaxy-core-stack';
import { Tag } from '@aws-cdk/core';

export interface ISharedVpc {
  readonly galaxy: IGalaxyCore;
  readonly vpc: ICoreVpc;
}

export interface SharedVpcCoreStackProps extends BaseNestedStackProps {
  vpcProps?: Partial<CoreVpcProps>;
}

export class SharedVpcCoreStack extends BaseNestedStack implements ISharedVpc {
  readonly galaxy: IGalaxyCore;
  readonly vpc: CoreVpc;

  constructor(galaxy: IGalaxyCore, id: string, props?: SharedVpcCoreStackProps) {
    super(galaxy, id, {
      ...props,
      type: 'Feature',
    });

    const { vpcProps } = props || {};

    this.galaxy = galaxy;

    const networkBuilder = this.networkBuilder || vpcProps?.networkBuilder;
    if (!networkBuilder) throw new Error('Network Builder must be provided.');

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
