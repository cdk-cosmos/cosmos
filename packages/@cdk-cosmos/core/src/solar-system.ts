import { Construct, Duration } from '@aws-cdk/core';
import { IVpc, Vpc } from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import {
  IPublicHostedZone,
  IPrivateHostedZone,
  PublicHostedZone,
  PrivateHostedZone,
  ZoneDelegationRecord,
} from '@aws-cdk/aws-route53';
import { isCrossAccount } from './helpers/utils';
import { BaseStack, BaseStackProps, COSMOS_PARTITION } from './base';
import { IGalaxyCore, IGalaxyExtension } from './galaxy';
import { CoreVpc, CoreVpcProps } from './components/core-vpc';
import { CrossAccountZoneDelegationRecord } from './helpers/cross-account';
import { RemoteVpc, RemoteZone } from './helpers/remote';

export interface ISolarSystemCore extends Construct {
  galaxy: IGalaxyCore;
  vpc: IVpc;
  zone: IPublicHostedZone;
  privateZone: IPrivateHostedZone;
  networkBuilder?: NetworkBuilder;
}

export interface ISolarSystemExtension extends Construct {
  galaxy: IGalaxyExtension;
  portal: ISolarSystemCore;
}

export interface SolarSystemCoreStackProps extends Partial<BaseStackProps> {
  cidr?: string;
  vpc?: Vpc;
  vpcProps?: Partial<CoreVpcProps>;
  zoneProps?: {
    linkZone?: boolean;
    ttl?: Duration;
  };
}

export class SolarSystemCoreStack extends BaseStack implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: Vpc;
  readonly zone: PublicHostedZone;
  readonly privateZone: PrivateHostedZone;

  constructor(galaxy: IGalaxyCore, id: string, props?: SolarSystemCoreStackProps) {
    super(galaxy, id, {
      description: 'Cosmos: Resources dependant on each SolarSystem, like Vpc and MainZone.',
      ...props,
      type: 'SolarSystem',
    });

    const { vpc, vpcProps = {}, zoneProps = {} } = props || {};
    const { linkZone = true, ttl = Duration.minutes(30) } = zoneProps;

    this.galaxy = galaxy;

    if (vpc) this.vpc = vpc as Vpc;
    else {
      if (!this.networkBuilder) {
        throw new Error(
          `NetworkBuilder not found, please define cidr range here (SolarSystem: ${id}) or Galaxy or Cosmos.`
        );
      }

      this.vpc = new CoreVpc(this, 'Vpc', {
        ...vpcProps,
        networkBuilder: this.networkBuilder,
      });
    }

    RemoteVpc.export(this.vpc, this.singletonId('Vpc'), this);

    const rootZone = this.galaxy.cosmos.rootZone;
    this.zone = new PublicHostedZone(this, 'Zone', {
      zoneName: `${id}.${rootZone.zoneName}`.toLowerCase(),
      comment: `Core Main Zone for ${id} SolarSystem`,
    });
    this.privateZone = new PrivateHostedZone(this, 'PrivateZone', {
      vpc: this.vpc,
      zoneName: `${id}.internal`.toLowerCase(),
      comment: `Core Main Private Zone for ${id} SolarSystem`,
    });
    RemoteZone.export(this.zone, this.singletonId('Zone'));
    RemoteZone.export(this.privateZone, this.singletonId('PrivateZone'));

    if (linkZone) {
      if (isCrossAccount(this.zone, rootZone)) {
        new CrossAccountZoneDelegationRecord(this, 'ZoneDelegation', {
          ttl,
          comment: `Core Zone Delegation for ${id} SolarSystem.`,
        });
      } else {
        new ZoneDelegationRecord(this, 'ZoneDelegation', {
          zone: rootZone,
          recordName: this.zone.zoneName,
          nameServers: this.zone.hostedZoneNameServers as string[],
          ttl,
          comment: `Core Zone Delegation for ${id} SolarSystem.`,
        });
      }
    }
  }
}

export class ImportedSolarSystemCore extends Construct implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: IVpc;
  readonly zone: IPublicHostedZone;
  readonly privateZone: IPrivateHostedZone;

  constructor(scope: Construct, id: string, galaxy: IGalaxyCore) {
    super(scope, id);
    this.node.type = 'SolarSystem';
    this.node.setContext(COSMOS_PARTITION, 'Core');

    this.galaxy = galaxy;
    this.vpc = RemoteVpc.import(this, this.singletonId('Vpc'), { hasIsolated: true });
    this.zone = RemoteZone.import(this, this.singletonId('Zone'));
    this.privateZone = RemoteZone.import(this, this.singletonId('PrivateZone'));
  }
}

export class SolarSystemExtensionStack extends BaseStack implements ISolarSystemExtension {
  readonly galaxy: IGalaxyExtension;
  readonly portal: ISolarSystemCore;

  constructor(galaxy: IGalaxyExtension, id: string, props?: Partial<BaseStackProps>) {
    super(galaxy, id, {
      description: 'Cosmos Extension: App resources dependant on each SolarSystem, like Services and Databases.',
      ...props,
      type: 'SolarSystem',
    });

    this.galaxy = galaxy;
    this.portal = new ImportedSolarSystemCore(this, 'Default', this.galaxy.portal);
  }
}
