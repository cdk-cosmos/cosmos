import { Construct, Stack, StackProps, ConstructNode } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import {
  VpcProps,
  Vpc,
  SubnetType,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
} from '@aws-cdk/aws-ec2';
import { isCrossAccount } from './helpers/utils';
import { BaseStack, BaseConstruct, BaseStackProps, COSMOS_PARTITION, PATTERN } from './base';
import { ICosmosCore, ICosmosExtension, CosmosCoreStack, CosmosExtensionStack, CosmosExtension } from './cosmos';

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
  readonly vpc?: Vpc;

  constructor(scope: Construct, name: string, cosmos: ICosmosCore, props: GalaxyCoreProps) {
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

  // AddSharedVpc(
  //   props?: Partial<VpcProps> & {
  //     cidrMask?: number;
  //     subnetMask?: number;
  //     defaultEndpoints?: boolean;
  //   }
  // ): Vpc {
  //   // TODO: Better pattern ??
  //   const { cidrMask = 24, subnetMask = 26, defaultEndpoints = true } = props || {};

  //   if (!this.NetworkBuilder) {
  //     throw new Error(`NetworkBuilder not found, please define cidr range here (Galaxy: ${this.Name}) or Cosmos.`);
  //   }

  //   this.Vpc = new Vpc(this, 'SharedVpc', {
  //     maxAzs: 2,
  //     subnetConfiguration: [
  //       {
  //         name: 'App',
  //         subnetType: SubnetType.ISOLATED,
  //         cidrMask: subnetMask,
  //       },
  //     ],
  //     ...props,
  //     cidr: this.NetworkBuilder.addSubnet(cidrMask),
  //   });

  //   this.Vpc.addGatewayEndpoint('S3Gateway', {
  //     service: GatewayVpcEndpointAwsService.S3,
  //     subnets: [{ subnetType: SubnetType.ISOLATED }],
  //   });

  //   if (defaultEndpoints) {
  //     this.Vpc.addInterfaceEndpoint('EcsEndpoint', {
  //       service: InterfaceVpcEndpointAwsService.ECS,
  //     });
  //     this.Vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
  //       service: InterfaceVpcEndpointAwsService.ECS_AGENT,
  //     });
  //     this.Vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
  //       service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
  //     });
  //     this.Vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
  //       service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
  //     });
  //     this.Vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
  //       service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
  //     });
  //   }

  //   return this.Vpc;
  // }
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
  readonly Cosmos: ICosmosCore;

  constructor(scope: CosmosCoreStack, id: string, props: GalaxyCoreStackProps) {
    super(scope.resource, id, {
      description: 'Galaxy: Resources dependant on each Aws Account, like ShareVpc and CrossAccountRoles.',
      ...props,
      type: 'Galaxy',
    });

    this.Cosmos = scope.resource;
    this._resource = new GalaxyCore(this, id, this.Cosmos, props);
  }
}

export class GalaxyExtensionStack extends BaseStack<GalaxyExtension> {
  readonly Cosmos: ICosmosExtension;

  constructor(scope: CosmosExtensionStack, id: string, props?: Partial<BaseStackProps>) {
    super(scope, id, {
      description: 'Galaxy Extension: App resources dependant on each Galaxy.',
      ...props,
      type: 'Galaxy',
    });

    this.Cosmos = scope.resource;
    this._resource = new GalaxyExtension(this, id, this.Cosmos);
  }
}
