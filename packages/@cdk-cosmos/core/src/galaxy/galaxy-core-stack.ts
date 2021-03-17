import { Construct, Stack, Tags, IConstruct } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { IKey, Key } from '@aws-cdk/aws-kms';
import { Config } from '@cosmos-building-blocks/common';
import { isCrossAccount } from '@cosmos-building-blocks/common/lib/utils';
import { BaseStack, BaseStackProps } from '../components/base';
import { ICosmosCore } from '../cosmos/cosmos-core-stack';

const GALAXY_CORE_SYMBOL = Symbol.for('@cdk-cosmos/core.GalaxyCore');

export interface IGalaxyCore extends Construct {
  readonly cosmos: ICosmosCore;
  readonly config: Config;
  readonly sharedKey?: IKey;
  readonly cdkCrossAccountRoleStaticArn?: string;
  readonly networkBuilder?: NetworkBuilder;
}

export interface GalaxyCoreStackProps extends BaseStackProps {}

export class GalaxyCoreStack extends BaseStack implements IGalaxyCore {
  readonly cosmos: ICosmosCore;
  readonly config: Config;
  readonly sharedKey: Key;
  readonly cdkCrossAccountRole?: Role;
  readonly cdkCrossAccountRoleStaticArn?: string;

  constructor(cosmos: ICosmosCore, id: string, props?: GalaxyCoreStackProps) {
    super(cosmos, id, {
      description: 'Cosmos Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      type: 'Galaxy',
      ...props,
    });

    Object.defineProperty(this, GALAXY_CORE_SYMBOL, { value: true });

    this.cosmos = cosmos;
    this.config = new Config(this, 'Config', id, this.cosmos.config);

    this.sharedKey = new Key(this, 'SharedKey', {
      description: 'Share key for aws account.',
      alias: 'SharedKey',
      trustAccountIdentities: true,
    });

    if (isCrossAccount(this, this.cosmos)) {
      const CdkCrossAccountRoleName = this.cosmos.singletonId('CdkCrossAccountRole');
      this.cdkCrossAccountRole = new Role(this, 'CdkCrossAccountRole', {
        roleName: CdkCrossAccountRoleName,
        assumedBy: new ArnPrincipal(this.cosmos.cdkMasterRoleStaticArn),
      });
      this.cdkCrossAccountRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
      this.cdkCrossAccountRoleStaticArn = `arn:aws:iam::${this.account}:role/${CdkCrossAccountRoleName}`;
    }

    this.addDependency(Stack.of(this.cosmos));
    Tags.of(this).add('cosmos:galaxy', this.node.id);
  }

  static isGalaxyCore(x: any): x is GalaxyCoreStack {
    return typeof x === 'object' && x !== null && GALAXY_CORE_SYMBOL in x;
  }

  static of(construct: IConstruct): GalaxyCoreStack {
    const scopes = [construct, ...construct.node.scopes];
    for (const scope of scopes) {
      if (GalaxyCoreStack.isGalaxyCore(scope)) return scope;
    }

    throw new Error(`No Galaxy Core Stack could be identified for the construct at path ${construct.node.path}`);
  }
}
