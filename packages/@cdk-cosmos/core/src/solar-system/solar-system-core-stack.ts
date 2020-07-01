import { Construct, Duration, Tag } from '@aws-cdk/core';
import { IVpc, Vpc } from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Certificate, DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import {
  IPublicHostedZone,
  IPrivateHostedZone,
  PublicHostedZone,
  PrivateHostedZone,
  ZoneDelegationRecord,
} from '@aws-cdk/aws-route53';
import { isCrossAccount } from '../helpers/utils';
import { BaseStack, BaseStackProps } from '../components/base';
import { IGalaxyCore } from '../galaxy/galaxy-core-stack';
import { CoreVpc, CoreVpcProps, addCommonEndpoints } from '../components/core-vpc';
import { CrossAccountZoneDelegationRecord } from '../components/cross-account';
import { RemoteVpc, RemoteZone } from '../helpers/remote';

export interface ISolarSystemCore extends Construct {
  readonly galaxy: IGalaxyCore;
  readonly vpc: IVpc;
  readonly zone: IPublicHostedZone;
  readonly privateZone: IPrivateHostedZone;
  readonly networkBuilder?: NetworkBuilder;
  readonly certificate?: Certificate;
}

export interface SolarSystemCoreStackProps extends BaseStackProps {
  vpc?: Vpc;
  vpcProps?: Partial<CoreVpcProps> & {
    defaultEndpoints?: boolean;
  };
  zoneProps?: {
    linkZone?: boolean;
    ttl?: Duration;
  };
  certificate?: boolean | { subDomains: string[] };
}

export class SolarSystemCoreStack extends BaseStack implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: Vpc;
  readonly zone: PublicHostedZone;
  readonly privateZone: PrivateHostedZone;
  readonly certificate?: Certificate;

  constructor(galaxy: IGalaxyCore, id: string, props?: SolarSystemCoreStackProps) {
    super(galaxy, id, {
      description: 'Cosmos SolarSystem: Resources dependant on each App Env, like Vpc and MainZone.',
      ...props,
      type: 'SolarSystem',
    });

    const { vpc, certificate = false, vpcProps = {}, zoneProps = {} } = props || {};
    const { defaultEndpoints = true } = vpcProps;
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

    // Only add endpoints if this component owens the Vpc.
    if (this.vpc.node.scope === this) {
      if (defaultEndpoints) addCommonEndpoints(this.vpc);
    }

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

    if (certificate) {
      this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
        hostedZone: this.zone,
        domainName: this.zone.zoneName,
        subjectAlternativeNames:
          typeof certificate === 'object' ? certificate.subDomains.map(x => `${x}.${this.zone.zoneName}`) : undefined,
      });
    }

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

    RemoteVpc.export(this.vpc, this.singletonId('Vpc'), this);
    RemoteZone.export(this.zone, this.singletonId('Zone'));
    RemoteZone.export(this.privateZone, this.singletonId('PrivateZone'));

    Tag.add(this, 'cosmos:solarsystem', id);
  }
}
