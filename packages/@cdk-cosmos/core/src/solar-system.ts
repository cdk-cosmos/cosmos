import { Construct, StackProps, Duration } from '@aws-cdk/core';
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
import { BaseStack, BaseConstruct, BaseStackProps, COSMOS_PARTITION, PATTERN } from './base';
import { IGalaxyCore, GalaxyCoreStack, IGalaxyExtension, GalaxyExtensionStack } from './galaxy';
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

export interface SolarSystemCoreProps extends StackProps {
  cidr?: string;
  vpc?: Vpc;
  vpcProps?: Partial<CoreVpcProps>;
  zoneProps?: {
    linkZone?: boolean;
    ttl?: Duration;
  };
}

export class SolarSystemCore extends BaseConstruct implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: Vpc;
  readonly zone: PublicHostedZone;
  readonly privateZone: PrivateHostedZone;

  constructor(scope: Construct, id: string, galaxy: IGalaxyCore, props?: SolarSystemCoreProps) {
    super(scope, id, {
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

  constructor(scope: Construct, name: string, galaxy: IGalaxyCore) {
    super(scope, name);
    this.node.type = 'SolarSystem';
    this.node.setContext(COSMOS_PARTITION, 'Core');

    this.galaxy = galaxy;
    this.vpc = RemoteVpc.import(this, this.singletonId('Vpc'), { hasIsolated: true });
    this.zone = RemoteZone.import(this, this.singletonId('Zone'));
    this.privateZone = RemoteZone.import(this, this.singletonId('PrivateZone'));
  }
}

export interface ISolarSystemExtension extends Construct {
  galaxy: IGalaxyExtension;
  portal: ISolarSystemCore;
}

export class SolarSystemExtension extends BaseConstruct implements ISolarSystemExtension {
  readonly galaxy: IGalaxyExtension;
  readonly portal: ISolarSystemCore;

  constructor(scope: Construct, name: string, galaxy: IGalaxyExtension) {
    super(scope, name, {
      type: 'SolarSystem',
    });

    this.galaxy = galaxy;
    this.portal = new ImportedSolarSystemCore(this, 'Default', this.galaxy.portal);
  }
}

export interface SolarSystemCoreStackProps extends SolarSystemCoreProps, Partial<BaseStackProps> {}

export class SolarSystemCoreStack extends BaseStack<SolarSystemCore> {
  readonly galaxy: IGalaxyCore;

  constructor(scope: GalaxyCoreStack, id: string, props?: SolarSystemCoreStackProps) {
    super(scope.resource, id, {
      description: 'Cosmos: Resources dependant on each SolarSystem, like Vpc and MainZone.',
      ...props,
      type: 'SolarSystem',
    });

    this.galaxy = scope.resource;
    this._resource = new SolarSystemCore(this, id, this.galaxy, props);
  }
}

export class SolarSystemExtensionStack extends BaseStack<SolarSystemExtension> {
  readonly galaxy: IGalaxyExtension;
  readonly portal: ISolarSystemCore;

  constructor(scope: GalaxyExtensionStack, id: string, props?: Partial<BaseStackProps>) {
    super(scope.resource, id, {
      description: 'Cosmos: App resources dependant on each SolarSystem, like Services and Databases.',
      ...props,
      type: 'SolarSystem',
    });

    this.galaxy = scope.resource;
    this._resource = new SolarSystemExtension(this, id, this.galaxy);
    this.portal = this.resource.portal;
  }
}
