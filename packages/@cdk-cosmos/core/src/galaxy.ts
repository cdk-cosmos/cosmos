import { Construct, Stack } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Vpc } from '@aws-cdk/aws-ec2';
import { isCrossAccount } from './helpers/utils';
import { BaseStack, BaseStackProps, COSMOS_PARTITION, PATTERN } from './base';
import { ICosmosCore, ICosmosExtension } from './cosmos';
import { CoreVpcProps, CoreVpc, addEcsEndpoints } from './components/core-vpc';

export interface IGalaxyCore extends Construct {
  cosmos: ICosmosCore;
  cdkCrossAccountRoleStaticArn?: string;
  networkBuilder?: NetworkBuilder;
}

export interface IGalaxyExtension extends Construct {
  cosmos: ICosmosExtension;
  portal: IGalaxyCore;
}

export interface GalaxyCoreStackProps extends Partial<BaseStackProps> {
  cidr?: string;
}

export class GalaxyCoreStack extends BaseStack implements IGalaxyCore {
  readonly cosmos: ICosmosCore;
  readonly cdkCrossAccountRole?: Role;
  readonly cdkCrossAccountRoleStaticArn?: string;
  vpc?: Vpc;

  constructor(cosmos: ICosmosCore, id: string, props?: GalaxyCoreStackProps) {
    super(cosmos, id, {
      description: 'Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      ...props,
      type: 'Galaxy',
    });

    this.cosmos = cosmos;

    if (isCrossAccount(this, this.cosmos)) {
      const CdkCrossAccountRoleName = this.generateId('CdkCrossAccountRole', '', PATTERN.SINGLETON_COSMOS);
      this.cdkCrossAccountRole = new Role(this, 'CdkCrossAccountRole', {
        roleName: CdkCrossAccountRoleName,
        assumedBy: new ArnPrincipal(this.cosmos.cdkMasterRoleStaticArn),
      });
      this.cdkCrossAccountRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
      this.cdkCrossAccountRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${CdkCrossAccountRoleName}`;
    }
  }

  addSharedVpc(props?: Partial<CoreVpcProps> & { defaultEndpoints: boolean }): Vpc {
    const { defaultEndpoints = true } = props || {};

    if (!this.networkBuilder) {
      throw new Error(`NetworkBuilder not found, please define cidr range here (Galaxy: ${this.node.id}) or Cosmos.`);
    }

    this.vpc = new CoreVpc(this, 'SharedVpc', {
      ...props,
      networkBuilder: this.networkBuilder,
    });
    if (defaultEndpoints) addEcsEndpoints(this.vpc);

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

  constructor(cosmos: ICosmosExtension, id: string, props?: Partial<BaseStackProps>) {
    super(cosmos, id, {
      description: 'Galaxy Extension: App resources dependant on each Galaxy.',
      ...props,
      type: 'Galaxy',
    });

    this.cosmos = cosmos;
    this.portal = new ImportedGalaxyCore(this, 'Default', this.cosmos.portal);
  }
}
