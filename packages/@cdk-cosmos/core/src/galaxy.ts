import { Construct, Stack, Tag } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Vpc } from '@aws-cdk/aws-ec2';
import { isCrossAccount } from './helpers/utils';
import { BaseStack, BaseStackOptions } from './components/base';
import { ICosmosCore, ICosmosExtension } from './cosmos';
import { CoreVpcProps, CoreVpc, addCommonEndpoints, addEcsEndpoints } from './components/core-vpc';
import { COSMOS_PARTITION, PATTERN } from './helpers/constants';

export interface IGalaxyCore extends Construct {
  cosmos: ICosmosCore;
  cdkCrossAccountRoleStaticArn?: string;
  networkBuilder?: NetworkBuilder;
}

export interface IGalaxyExtension extends Construct {
  cosmos: ICosmosExtension;
  portal: IGalaxyCore;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GalaxyCoreStackProps extends BaseStackOptions {}

export class GalaxyCoreStack extends BaseStack implements IGalaxyCore {
  readonly cosmos: ICosmosCore;
  readonly cdkCrossAccountRole?: Role;
  readonly cdkCrossAccountRoleStaticArn?: string;
  vpc?: Vpc;

  constructor(cosmos: ICosmosCore, id: string, props?: GalaxyCoreStackProps) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      ...props,
      type: 'Galaxy',
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

export class ImportedGalaxyCore extends Construct implements IGalaxyCore {
  readonly cosmos: ICosmosCore;

  constructor(scope: Construct, id: string, cosmos: ICosmosCore) {
    super(scope, id);
    this.node.type = 'Galaxy';
    this.node.setContext(COSMOS_PARTITION, 'Core');

    this.cosmos = cosmos;
  }
}

export class GalaxyExtensionStack extends BaseStack implements IGalaxyExtension {
  readonly cosmos: ICosmosExtension;
  readonly portal: IGalaxyCore;

  constructor(cosmos: ICosmosExtension, id: string, props?: BaseStackOptions) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy Extension: App resources dependant on each Aws Account.',
      ...props,
      type: 'Galaxy',
    });

    this.cosmos = cosmos;
    this.portal = new ImportedGalaxyCore(this, 'Default', this.cosmos.portal);

    Tag.add(this, 'cosmos:galaxy:extension', id);
  }
}
