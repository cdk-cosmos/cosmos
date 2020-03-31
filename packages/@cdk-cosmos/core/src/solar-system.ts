import { Construct, Stack, StackProps, Duration } from '@aws-cdk/core';
import {
  IVpc,
  SubnetType,
  Vpc,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  VpcProps,
} from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { IHostedZone, HostedZone, ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import {
  RESOLVE,
  PATTERN,
  Bubble,
  Galaxy,
  GalaxyExtension,
  SolarSystem,
  SolarSystemExtension,
  RemoteVpc,
  RemoteZone,
} from '.';
import { isCrossAccount } from './helpers/utils';
import { CrossAccountZoneDelegationRecord } from './helpers/cross-account';

const stackName = (galaxy: Bubble, name: string): string =>
  RESOLVE(PATTERN.SOLAR_SYSTEM, 'SolarSystem', { Name: name, Galaxy: galaxy });

export interface SolarSystemProps extends StackProps {
  cidr?: string;
  vpcProps?: Partial<VpcProps> & {
    cidrMask?: number;
    subnetMask?: number;
    defaultEndpoints?: boolean;
  };
  zoneProps?: {
    linkZone?: boolean;
    ttl?: Duration;
  };
}

export class SolarSystemStack extends Stack implements SolarSystem {
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly NetworkBuilder?: NetworkBuilder;
  readonly Vpc: Vpc;
  readonly Zone: HostedZone;

  constructor(galaxy: Galaxy, name: string, props?: SolarSystemProps) {
    super(galaxy.Cosmos.Scope, stackName(galaxy, name), {
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    const { cidr, vpcProps = {}, zoneProps = {} } = props || {};
    const { cidrMask = 24, subnetMask = 26, defaultEndpoints = true } = vpcProps;
    const { linkZone = true, ttl = Duration.minutes(30) } = zoneProps;

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = name;
    if (cidr) this.NetworkBuilder = new NetworkBuilder(cidr);
    else if (this.Galaxy.NetworkBuilder) this.NetworkBuilder = this.Galaxy.NetworkBuilder;

    this.Vpc = this.Galaxy.node.tryFindChild('SharedVpc') as Vpc;
    if (!this.Vpc) {
      if (!this.NetworkBuilder) {
        throw new Error(
          `NetworkBuilder not found, please define cidr range here or Galaxy or Cosmos. (System: ${this.Name}).`
        );
      }

      this.Vpc = new Vpc(this.Galaxy, 'SharedVpc', {
        subnetConfiguration: [
          {
            name: 'Main',
            subnetType: SubnetType.ISOLATED,
            cidrMask: subnetMask,
          },
        ],
        maxAzs: 2,
        ...vpcProps,
        cidr: this.NetworkBuilder.addSubnet(cidrMask),
      });

      if (defaultEndpoints) {
        // TODO: move to internet endpoint Endpoints ?
        this.Vpc.addGatewayEndpoint('S3Gateway', {
          service: GatewayVpcEndpointAwsService.S3,
          subnets: [this.Vpc.selectSubnets({ onePerAz: true })],
        });
        this.Vpc.addInterfaceEndpoint('EcsEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECS,
        });
        this.Vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECS_AGENT,
        });
        this.Vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
        });
        this.Vpc.addInterfaceEndpoint('EcrEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECR,
        });
        this.Vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
          service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        });
      }

      RemoteVpc.export(this.Vpc, RESOLVE(PATTERN.SINGLETON_GALAXY, 'SharedVpc', this));
    }

    const rootZoneName = this.Galaxy.Cosmos.RootZone.zoneName;
    this.Zone = new HostedZone(this, 'Zone', {
      zoneName: `${name}.${rootZoneName}`.toLowerCase(),
      comment: `Core Main Zone for ${this.Name} SolarSystem`,
    });
    RemoteZone.export(this.Zone, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Zone', this));

    if (linkZone) {
      if (isCrossAccount(this, this.Galaxy.Cosmos)) {
        new CrossAccountZoneDelegationRecord(this, 'ZoneDelegation', {
          ttl,
          comment: `Core Zone Delegation for ${this.Name} SolarSystem.`,
        });
      } else {
        new ZoneDelegationRecord(this, 'ZoneDelegation', {
          zone: this.Galaxy.Cosmos.RootZone,
          recordName: this.Zone.zoneName,
          nameServers: this.Zone.hostedZoneNameServers as string[],
          ttl,
          comment: `Core Zone Delegation for ${this.Name} SolarSystem.`,
        });
      }
    }
  }
}

export class ImportedSolarSystem extends Construct implements SolarSystem {
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly Vpc: IVpc;
  readonly Zone: IHostedZone;

  constructor(scope: Construct, galaxy: Galaxy, name: string) {
    super(scope, 'SolarSystemImport');

    this.Galaxy = galaxy;
    this.Name = name;
    this.Vpc = RemoteVpc.import(this, RESOLVE(PATTERN.SINGLETON_GALAXY, 'SharedVpc', this), { hasIsolated: true });
    this.Zone = RemoteZone.import(this, RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Zone', this));
  }
}

export class SolarSystemExtensionStack extends Stack implements SolarSystemExtension {
  readonly Galaxy: GalaxyExtension;
  readonly Portal: SolarSystem;
  readonly Name: string;

  constructor(galaxy: GalaxyExtension, name: string, props?: StackProps) {
    super(galaxy.Cosmos.Scope, stackName(galaxy, name), {
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = name;
    this.Portal = new ImportedSolarSystem(this, this.Galaxy.Portal, this.Name);
  }
}
