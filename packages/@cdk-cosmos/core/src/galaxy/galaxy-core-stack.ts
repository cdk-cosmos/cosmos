import { Construct, Stack, Tag } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Vpc } from '@aws-cdk/aws-ec2';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';
import { CoreVpcProps, CoreVpc, addCommonEndpoints, addEcsEndpoints } from '../components/core-vpc';
import { PATTERN } from '../helpers/constants';
import { isCrossAccount } from '../helpers/utils';

export interface IGalaxyCore extends Construct {
  cosmos: ICosmosCore;
  cdkCrossAccountRoleStaticArn?: string;
  networkBuilder?: NetworkBuilder;
}

export interface GalaxyCoreStackProps extends BaseStackProps {}

export class GalaxyCoreStack extends BaseStack implements IGalaxyCore {
  readonly cosmos: ICosmosCore;
  readonly cdkCrossAccountRole?: Role;
  readonly cdkCrossAccountRoleStaticArn?: string;
  vpc?: Vpc;

  constructor(cosmos: ICosmosCore, id: string, props?: GalaxyCoreStackProps) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      type: 'Galaxy',
      ...props,
    });

    this.cosmos = cosmos;

    if (isCrossAccount(this, this.cosmos)) {
      const CdkCrossAccountRoleName = this.nodeId('CdkCrossAccountRole', '', PATTERN.SINGLETON_COSMOS);
      this.cdkCrossAccountRole = new Role(this, 'CdkCrossAccountRole', {
        roleName: CdkCrossAccountRoleName,
        assumedBy: new ArnPrincipal(this.cosmos.cdkMasterRoleStaticArn),
      });
      this.cdkCrossAccountRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
      this.cdkCrossAccountRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${CdkCrossAccountRoleName}`;
    }

    Tag.add(this, 'cosmos:galaxy', id);
  }

  addSharedVpc(props?: Partial<CoreVpcProps> & { commonEndpoints?: boolean; ecsEndpoints?: boolean }): Vpc {
    const { commonEndpoints = true, ecsEndpoints = true } = props || {};

    if (!this.networkBuilder) {
      throw new Error(`NetworkBuilder not found, please define cidr range here (Galaxy: ${this.node.id}) or Cosmos.`);
    }

    this.vpc = new CoreVpc(this, 'SharedVpc', {
      ...props,
      networkBuilder: this.networkBuilder,
    });

    if (commonEndpoints) addCommonEndpoints(this.vpc);
    if (ecsEndpoints) addEcsEndpoints(this.vpc);

    return this.vpc;
  }
}
