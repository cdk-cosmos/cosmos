import { Construct, Stack, StackProps, Duration } from '@aws-cdk/core';
import { IVpc, SubnetType, Vpc, GatewayVpcEndpointAwsService, VpcProps } from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import {
  IPublicHostedZone,
  IPrivateHostedZone,
  PublicHostedZone,
  PrivateHostedZone,
  ZoneDelegationRecord,
} from '@aws-cdk/aws-route53';
import {
  RESOLVE,
  PATTERN,
  Bubble,
  Galaxy,
  GalaxyExtension,
  SolarSystem,
  SolarSystemExtension,
  RemoteVpc,
  RemoteVpcImportProps,
  RemoteZone,
} from '.';
import { isCrossAccount } from './helpers/utils';
import { CrossAccountZoneDelegationRecord } from './helpers/cross-account';

const stackName = (galaxy: Bubble, name: string): string =>
  RESOLVE(PATTERN.SOLAR_SYSTEM, 'SolarSystem', { Name: name, Galaxy: galaxy });

export interface SolarSystemProps extends StackProps {
  cidr?: string;
  vpc?: Vpc;
  vpcProps?: Partial<VpcProps> & {
    cidrMask?: number;
    subnetMask?: number;
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
  readonly Zone: PublicHostedZone;
  readonly PrivateZone: PrivateHostedZone;

  constructor(galaxy: Galaxy, name: string, props?: SolarSystemProps) {
    super(galaxy.Cosmos.Scope, stackName(galaxy, name), {
      description: 'Cosmos: Resources dependant on each SolarSystem, like Vpc and MainZone.',
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    const { cidr, vpc, vpcProps = {}, zoneProps = {} } = props || {};
    const { cidrMask = 24, subnetMask = 26 } = vpcProps;
    const { linkZone = true, ttl = Duration.minutes(30) } = zoneProps;

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = name;
    if (cidr) this.NetworkBuilder = new NetworkBuilder(cidr);
    else if (this.Galaxy.NetworkBuilder) this.NetworkBuilder = this.Galaxy.NetworkBuilder;

    if (vpc) this.Vpc = vpc as Vpc;
    else {
      if (!this.NetworkBuilder) {
        throw new Error(
          `NetworkBuilder not found, please define cidr range here (SolarSystem: ${this.Name}) or Galaxy or Cosmos.`
        );
      }

      this.Vpc = new Vpc(this, 'Vpc', {
        maxAzs: 2,
        subnetConfiguration: [
          {
            name: 'App',
            subnetType: SubnetType.ISOLATED,
            cidrMask: subnetMask,
          },
        ],
        ...vpcProps,
        cidr: this.NetworkBuilder.addSubnet(cidrMask),
      });

      this.Vpc.addGatewayEndpoint('S3Gateway', {
        service: GatewayVpcEndpointAwsService.S3,
        subnets: [{ subnetGroupName: 'App' }],
      });
    }

    RemoteVpc.export(this.Vpc, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Vpc'), this);

    const rootZoneName = this.Galaxy.Cosmos.RootZone.zoneName;
    this.Zone = new PublicHostedZone(this, 'Zone', {
      zoneName: `${this.Name}.${rootZoneName}`.toLowerCase(),
      comment: `Core Main Zone for ${this.Name} SolarSystem`,
    });
    this.PrivateZone = new PrivateHostedZone(this, 'PrivateZone', {
      vpc: this.Vpc,
      zoneName: `${this.Name}.internal`.toLowerCase(),
      comment: `Core Main Private Zone for ${this.Name} SolarSystem`,
    });
    RemoteZone.export(this.Zone, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Zone'));
    RemoteZone.export(this.PrivateZone, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'PrivateZone'));

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

export interface ImportedSolarSystemProps {
  name: string;
  vpcProps?: RemoteVpcImportProps;
}

export class ImportedSolarSystem extends Construct implements SolarSystem {
  readonly Galaxy: Galaxy;
  readonly Name: string;
  readonly Vpc: IVpc;
  readonly Zone: IPublicHostedZone;
  readonly PrivateZone: IPrivateHostedZone;

  constructor(scope: Construct, galaxy: Galaxy, props: ImportedSolarSystemProps) {
    super(scope, 'SolarSystemImport');

    const { name, vpcProps = {} } = props;

    this.Galaxy = galaxy;
    this.Name = name;
    this.Vpc = RemoteVpc.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Vpc'), {
      isolatedSubnetNames: ['App'],
      ...vpcProps,
    });
    this.Zone = RemoteZone.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'Zone'));
    this.PrivateZone = RemoteZone.import(this, this.RESOLVE(PATTERN.SINGLETON_SOLAR_SYSTEM, 'PrivateZone'));
  }
}

export interface SolarSystemExtensionStackProps extends StackProps {
  vpcProps?: RemoteVpcImportProps;
}

export class SolarSystemExtensionStack extends Stack implements SolarSystemExtension {
  readonly Galaxy: GalaxyExtension;
  readonly Portal: SolarSystem;
  readonly Name: string;

  constructor(galaxy: GalaxyExtension, name: string, props?: SolarSystemExtensionStackProps) {
    super(galaxy.Cosmos.Scope, stackName(galaxy, name), {
      description: 'Cosmos: App resources dependant on each SolarSystem, like Services and Databases.',
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = name;
    this.Portal = new ImportedSolarSystem(this, this.Galaxy.Portal, {
      name: this.Name,
      vpcProps: props?.vpcProps,
    });
  }
}
