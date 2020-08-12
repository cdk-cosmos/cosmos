import { Construct, Stack, Tag } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';
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

  constructor(cosmos: ICosmosCore, id: string, props?: GalaxyCoreStackProps) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      type: 'Galaxy',
      ...props,
    });

    this.cosmos = cosmos;

    if (isCrossAccount(this, this.cosmos)) {
      const CdkCrossAccountRoleName = this.cosmos.nodeId('CdkCrossAccountRole', '', PATTERN.SINGLETON_COSMOS);
      this.cdkCrossAccountRole = new Role(this, 'CdkCrossAccountRole', {
        roleName: CdkCrossAccountRoleName,
        assumedBy: new ArnPrincipal(this.cosmos.cdkMasterRoleStaticArn),
      });
      this.cdkCrossAccountRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
      this.cdkCrossAccountRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${CdkCrossAccountRoleName}`;
    }

    Tag.add(this, 'cosmos:galaxy', this.node.id);
  }
}
