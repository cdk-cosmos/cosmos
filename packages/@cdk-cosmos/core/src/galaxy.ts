import { Construct, Stack, Tag } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Vpc } from '@aws-cdk/aws-ec2';
import { isCrossAccount } from './helpers/utils';
import {
  BaseStack,
  BaseStackProps,
  BaseConstruct,
  BaseConstructProps,
  BaseExtensionStack,
  IBaseExtension,
  BaseExtensionStackProps,
} from './components/base';
import { ICosmosCore, ICosmosExtension } from './cosmos';
import { CoreVpcProps, CoreVpc, addCommonEndpoints, addEcsEndpoints } from './components/core-vpc';
import { PATTERN } from './helpers/constants';

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

export interface ImportedGalaxyCoreProps extends BaseConstructProps {}

export class ImportedGalaxyCore extends BaseConstruct implements IGalaxyCore {
  readonly cosmos: ICosmosCore;

  constructor(cosmos: ICosmosCore, id: string, props?: ImportedGalaxyCoreProps) {
    super(cosmos, id, {
      type: 'Galaxy',
      ...props,
    });

    this.cosmos = cosmos;
  }
}

export interface IGalaxyExtension extends IBaseExtension<IGalaxyCore> {
  cosmos: ICosmosExtension;
}

export interface GalaxyExtensionStackProps extends BaseExtensionStackProps<ImportedGalaxyCoreProps> {}

export class GalaxyExtensionStack extends BaseExtensionStack<IGalaxyCore> implements IGalaxyExtension {
  readonly cosmos: ICosmosExtension;

  constructor(cosmos: ICosmosExtension, id: string, props?: GalaxyExtensionStackProps) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy Extension: App resources dependant on each Aws Account.',
      type: 'Galaxy',
      ...props,
    });

    this.cosmos = cosmos;

    Tag.add(this, 'cosmos:galaxy:extension', id);
  }

  protected getPortal(props?: GalaxyExtensionStackProps): IGalaxyCore {
    const cosmos = this.node.scope as ICosmosExtension;
    return new ImportedGalaxyCore(cosmos.portal, this.node.id, props?.portalProps);
  }
}
