import { Construct } from '@aws-cdk/core';
import { BaseFeature, BaseFeatureProps } from '../../components/base';
import { CoreVpcProps, ICoreVpc, CoreVpc } from '../../components/core-vpc';
import { IGalaxyCore, GalaxyCoreStack } from '../../galaxy/galaxy-core-stack';

export interface ISharedVpc extends Construct {
  readonly galaxy: IGalaxyCore;
  readonly vpc: ICoreVpc;
}

export interface SharedVpcGalaxyCoreStackProps extends BaseFeatureProps {
  vpcProps?: Partial<CoreVpcProps>;
}

export class SharedVpcGalaxyCoreStack extends BaseFeature implements ISharedVpc {
  readonly galaxy: IGalaxyCore;
  readonly vpc: CoreVpc;

  constructor(galaxy: IGalaxyCore, id: string, props?: SharedVpcGalaxyCoreStackProps) {
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
  }
}

declare module '../../galaxy/galaxy-core-stack' {
  export interface IGalaxyCore {
    readonly sharedVpc?: ISharedVpc;
  }
  interface GalaxyCoreStack {
    sharedVpc?: SharedVpcGalaxyCoreStack;
    addSharedVpc(props?: SharedVpcGalaxyCoreStackProps): SharedVpcGalaxyCoreStack;
  }
}

GalaxyCoreStack.prototype.addSharedVpc = function(props?: SharedVpcGalaxyCoreStackProps): SharedVpcGalaxyCoreStack {
  this.sharedVpc = new SharedVpcGalaxyCoreStack(this, 'SharedVpc', props);
  return this.sharedVpc;
};
