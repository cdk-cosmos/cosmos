import { Construct, Stack } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Vpc, InterfaceVpcEndpointAwsService } from '@aws-cdk/aws-ec2';
import { isCrossAccount } from './helpers/utils';
import { BaseStack, BaseConstruct, BaseStackProps, COSMOS_PARTITION, PATTERN } from './base';
import { ICosmosCore, ICosmosExtension, CosmosCoreStack, CosmosExtensionStack } from './cosmos';
import { CoreVpcProps, CoreVpc } from './components/core-vpc';

export interface IGalaxyCore extends Construct {
  cosmos: ICosmosCore;
  cdkCrossAccountRoleStaticArn?: string;
  networkBuilder?: NetworkBuilder;
}

export interface GalaxyCoreProps {
  cidr?: string;
}

export class GalaxyCore extends BaseConstruct implements IGalaxyCore {
  readonly cosmos: ICosmosCore;
  readonly cdkCrossAccountRole?: Role;
  readonly cdkCrossAccountRoleStaticArn?: string;
  vpc?: Vpc;

  constructor(scope: Construct, name: string, cosmos: ICosmosCore, props?: GalaxyCoreProps) {
    super(scope, name, {
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

    if (defaultEndpoints) {
      this.vpc.addInterfaceEndpoint('EcsEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS,
        subnets: { subnetGroupName: 'App' },
      });
      this.vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS_AGENT,
        subnets: { subnetGroupName: 'App' },
      });
      this.vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
        subnets: { subnetGroupName: 'App' },
      });
      this.vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: { subnetGroupName: 'App' },
      });
      this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: { subnetGroupName: 'App' },
      });
    }

    return this.vpc;
  }
}

export class ImportedGalaxyCore extends Construct implements IGalaxyCore {
  readonly cosmos: ICosmosCore;

  constructor(scope: Construct, name: string, cosmos: ICosmosCore) {
    super(scope, name);
    this.node.type = 'Galaxy';
    this.node.setContext(COSMOS_PARTITION, 'Core');

    this.cosmos = cosmos;
  }
}

export interface IGalaxyExtension extends Construct {
  cosmos: ICosmosExtension;
  portal: IGalaxyCore;
}

export class GalaxyExtension extends BaseConstruct implements IGalaxyExtension {
  readonly cosmos: ICosmosExtension;
  readonly portal: IGalaxyCore;

  constructor(scope: Construct, name: string, cosmos: ICosmosExtension) {
    super(scope, name, {
      type: 'Galaxy',
    });

    this.cosmos = cosmos;
    this.portal = new ImportedGalaxyCore(this, 'Default', this.cosmos.portal);
  }
}

export interface GalaxyCoreStackProps extends GalaxyCoreProps, Partial<BaseStackProps> {}

export class GalaxyCoreStack extends BaseStack<GalaxyCore> {
  readonly cosmos: ICosmosCore;

  constructor(scope: CosmosCoreStack, id: string, props?: GalaxyCoreStackProps) {
    super(scope.resource, id, {
      description: 'Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      ...props,
      type: 'Galaxy',
    });

    this.cosmos = scope.resource;
    this._resource = new GalaxyCore(this, id, this.cosmos, props);
  }
}

export class GalaxyExtensionStack extends BaseStack<GalaxyExtension> {
  readonly cosmos: ICosmosExtension;
  readonly portal: IGalaxyCore;

  constructor(scope: CosmosExtensionStack, id: string, props?: Partial<BaseStackProps>) {
    super(scope.resource, id, {
      description: 'Galaxy Extension: App resources dependant on each Galaxy.',
      ...props,
      type: 'Galaxy',
    });

    this.cosmos = scope.resource;
    this._resource = new GalaxyExtension(this, id, this.cosmos);
    this.portal = this.resource.portal;
  }
}
