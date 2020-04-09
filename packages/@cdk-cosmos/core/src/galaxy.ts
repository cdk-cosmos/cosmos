import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import {
  RESOLVE,
  PATTERN,
  Bubble,
  Cosmos,
  Galaxy,
  SolarSystem,
  CosmosExtension,
  GalaxyExtension,
  SolarSystemExtension,
  isCrossAccount,
} from '.';
import {
  VpcProps,
  Vpc,
  SubnetType,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
} from '@aws-cdk/aws-ec2';

const stackName = (cosmos: Bubble, name: string): string =>
  RESOLVE(PATTERN.GALAXY, 'Galaxy', { Name: name, Cosmos: cosmos });

export interface GalaxyStackProps extends StackProps {
  cidr?: string;
}

export class GalaxyStack extends Stack implements Galaxy {
  readonly Cosmos: Cosmos;
  readonly SolarSystems: SolarSystem[];
  readonly Name: string;
  readonly NetworkBuilder?: NetworkBuilder;
  readonly CdkCrossAccountRole?: Role;
  readonly CdkCrossAccountRoleStaticArn?: string;
  Vpc?: Vpc;

  constructor(cosmos: Cosmos, name: string, props?: GalaxyStackProps) {
    super(cosmos.Scope, stackName(cosmos, name), {
      description: 'Resources dependant on each Galaxy, like ShareVpc and CrossAccountRoles.',
      ...props,
      env: {
        account: props?.env?.account || cosmos.account,
        region: props?.env?.region || cosmos.region,
      },
    });

    const { cidr } = props || {};

    this.Cosmos = cosmos;
    this.Cosmos.AddGalaxy(this);
    this.SolarSystems = [];
    this.Name = name;
    if (cidr) this.NetworkBuilder = new NetworkBuilder(cidr);
    else if (this.Cosmos.NetworkBuilder) this.NetworkBuilder = this.Cosmos.NetworkBuilder;

    if (isCrossAccount(this, this.Cosmos)) {
      const CdkCrossAccountRoleName = this.RESOLVE(PATTERN.SINGLETON_COSMOS, 'CdkCrossAccount-Role');
      this.CdkCrossAccountRole = new Role(this, 'CdkCrossAccountRole', {
        roleName: CdkCrossAccountRoleName,
        assumedBy: new ArnPrincipal(this.Cosmos.CdkMasterRoleStaticArn),
      });
      this.CdkCrossAccountRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
      this.CdkCrossAccountRoleStaticArn = `arn:aws:iam::${this.account}:role/${CdkCrossAccountRoleName}`;
    }
  }

  AddSharedVpc(
    props?: Partial<VpcProps> & {
      cidrMask?: number;
      subnetMask?: number;
      defaultEndpoints?: boolean;
    }
  ): Vpc {
    const { cidrMask = 24, subnetMask = 26, defaultEndpoints = true } = props || {};

    if (!this.NetworkBuilder) {
      throw new Error(`NetworkBuilder not found, please define cidr range here (Galaxy: ${this.Name}) or Cosmos.`);
    }

    this.Vpc = new Vpc(this, 'SharedVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'Main',
          subnetType: SubnetType.ISOLATED,
          cidrMask: subnetMask,
        },
      ],
      ...props,
      cidr: this.NetworkBuilder.addSubnet(cidrMask),
    });

    this.Vpc.addGatewayEndpoint('S3Gateway', {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [this.Vpc.selectSubnets({ subnetType: SubnetType.ISOLATED })],
    });

    if (defaultEndpoints) {
      this.Vpc.addInterfaceEndpoint('EcsEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS,
      });
      this.Vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS_AGENT,
      });
      this.Vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
      });
      this.Vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
      });
      this.Vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      });
    }

    return this.Vpc;
  }

  AddSolarSystem(solarSystem: SolarSystem): void {
    this.SolarSystems.push(solarSystem);
    this.Cosmos.AddSolarSystem(solarSystem);
  }
}

export class ImportedGalaxy extends Construct implements Galaxy {
  readonly Cosmos: Cosmos;
  readonly Name: string;

  constructor(scope: Construct, cosmos: Cosmos, name: string) {
    super(scope, 'GalaxyImport');

    this.Cosmos = cosmos;
    this.Name = name;
  }

  /* eslint-disable @typescript-eslint/no-empty-function */
  // istanbul ignore next
  AddSolarSystem(): void {}
  /* eslint-enable @typescript-eslint/no-empty-function */
}

export class GalaxyExtensionStack extends Stack implements GalaxyExtension {
  readonly Cosmos: CosmosExtension;
  readonly SolarSystems: Array<SolarSystem | SolarSystemExtension>;
  readonly Portal: Galaxy;
  readonly Name: string;

  constructor(cosmos: CosmosExtension, name: string, props?: StackProps) {
    super(cosmos.Scope, stackName(cosmos, name), {
      description: 'App resources dependant on each Galaxy.',
      ...props,
      env: {
        account: props?.env?.account || cosmos.account,
        region: props?.env?.region || cosmos.region,
      },
    });

    this.Cosmos = cosmos;
    this.Cosmos.AddGalaxy(this);
    this.SolarSystems = [];
    this.Portal = new ImportedGalaxy(this, this.Cosmos.Portal, name);
    this.Name = name;
  }

  AddSolarSystem(solarSystem: SolarSystem | SolarSystemExtension): void {
    this.SolarSystems.push(solarSystem);
    this.Cosmos.AddSolarSystem(solarSystem);
  }
}
