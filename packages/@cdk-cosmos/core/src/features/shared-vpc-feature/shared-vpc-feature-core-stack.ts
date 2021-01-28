import { Construct } from '@aws-cdk/core';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { CoreVpcProps, ICoreVpc, CoreVpc } from '../../components/core-vpc';
import { IGalaxyCore, GalaxyCoreStack } from '../../galaxy/galaxy-core-stack';

export interface ISharedVpcFeature extends Construct {
  readonly galaxy: IGalaxyCore;
  readonly vpc: ICoreVpc;
}

export interface SharedVpcFeatureCoreStackProps extends BaseFeatureStackProps {
  vpcProps?: Partial<CoreVpcProps>;
}

export class SharedVpcFeatureCoreStack extends BaseFeatureStack implements ISharedVpcFeature {
  readonly galaxy: IGalaxyCore;
  readonly vpc: CoreVpc;

  constructor(galaxy: IGalaxyCore, id: string, props?: SharedVpcFeatureCoreStackProps) {
    super(galaxy, id, props);

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
    readonly sharedVpc?: ISharedVpcFeature;
  }
  export interface GalaxyCoreStack {
    sharedVpc?: SharedVpcFeatureCoreStack;
    addSharedVpc(props?: SharedVpcFeatureCoreStackProps): SharedVpcFeatureCoreStack;
  }
}

GalaxyCoreStack.prototype.addSharedVpc = function (props?: SharedVpcFeatureCoreStackProps): SharedVpcFeatureCoreStack {
  this.sharedVpc = new SharedVpcFeatureCoreStack(this, 'SharedVpc', props);
  return this.sharedVpc;
};
