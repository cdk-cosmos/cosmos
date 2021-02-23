import { Construct, Stack, Duration, Tags, IConstruct } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';
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
import { CoreVpc, CoreVpcProps, ICoreVpc } from '../components/core-vpc';
import { CrossAccountZoneDelegationRecord } from '../components/cross-account';
import { RemoteVpc, RemoteZone } from '../components/remote';

const SOLAR_SYSTEM_CORE_SYMBOL = Symbol.for('@cdk-cosmos/core.CosmosCore');

export interface ISolarSystemCore extends Construct {
  readonly galaxy: IGalaxyCore;
  readonly vpc: ICoreVpc;
  readonly zone: IPublicHostedZone;
  readonly privateZone: IPrivateHostedZone;
  readonly networkBuilder?: NetworkBuilder;
  readonly certificate?: Certificate;
}

export interface SolarSystemCoreStackProps extends BaseStackProps {
  vpc?: Vpc;
  vpcProps?: Partial<CoreVpcProps>;
  zoneProps?: {
    linkZone?: boolean;
    ttl?: Duration;
  };
  certificate?: boolean | { subDomains: string[] };
}

export class SolarSystemCoreStack extends BaseStack implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: CoreVpc;
  readonly zone: PublicHostedZone;
  readonly privateZone: PrivateHostedZone;
  readonly certificate?: Certificate;

  constructor(galaxy: IGalaxyCore, id: string, props?: SolarSystemCoreStackProps) {
    super(galaxy, id, {
      description: 'Cosmos SolarSystem: Resources dependant on each App Env, like Vpc and MainZone.',
      ...props,
      type: 'SolarSystem',
    });

    Object.defineProperty(this, SOLAR_SYSTEM_CORE_SYMBOL, { value: true });

    const { vpc, certificate, vpcProps = {}, zoneProps = {} } = props || {};
    const { linkZone = true, ttl = Duration.minutes(30) } = zoneProps;

    this.galaxy = galaxy;

    if (vpc) this.vpc = vpc as CoreVpc;
    else {
      const networkBuilder = this.networkBuilder || vpcProps.networkBuilder;
      if (!networkBuilder) throw new Error('Network Builder must be provided.');

      this.vpc = new CoreVpc(this, 'Vpc', {
        ...vpcProps,
        networkBuilder,
      });
    }

    CoreVpc.addCommonEndpoints(this.vpc);

    const rootZone = this.galaxy.cosmos.rootZone;
    this.zone = new PublicHostedZone(this, 'Zone', {
      zoneName: `${this.node.id}.${rootZone.zoneName}`.toLowerCase(),
      comment: `Core Main Zone for ${this.node.id} SolarSystem`,
    });

    this.privateZone = new PrivateHostedZone(this, 'PrivateZone', {
      vpc: this.vpc,
      zoneName: `${this.node.id}.internal`.toLowerCase(),
      comment: `Core Main Private Zone for ${this.node.id} SolarSystem`,
    });

    if (certificate) {
      this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
        hostedZone: this.zone,
        domainName: this.zone.zoneName,
        subjectAlternativeNames:
          typeof certificate === 'object' ? certificate.subDomains.map((x) => `${x}.${this.zone.zoneName}`) : undefined,
      });
    }

    if (linkZone) {
      if (isCrossAccount(this.zone, rootZone)) {
        new CrossAccountZoneDelegationRecord(this, 'ZoneDelegation', {
          ttl: ttl,
          comment: `Core Zone Delegation for ${this.node.id} SolarSystem.`,
        });
      } else {
        new ZoneDelegationRecord(this, 'ZoneDelegation', {
          zone: rootZone,
          recordName: this.zone.zoneName,
          nameServers: this.zone.hostedZoneNameServers as string[],
          ttl: ttl,
          comment: `Core Zone Delegation for ${this.node.id} SolarSystem.`,
        });
      }
    }

    new RemoteVpc(this.vpc, this.singletonId('Vpc'), this);
    if (this.vpc.zone) new RemoteZone(this.vpc.zone, this.singletonId('VpcZone'), new Construct(this, 'VpcZone'));
    new RemoteZone(this.zone, this.singletonId('Zone'));
    new RemoteZone(this.privateZone, this.singletonId('PrivateZone'));

    this.addDependency(Stack.of(this.galaxy));
    Tags.of(this).add('cosmos:solarsystem', this.node.id);
  }

  static isSolarSystemCore(x: any): x is SolarSystemCoreStack {
    return typeof x === 'object' && x !== null && SOLAR_SYSTEM_CORE_SYMBOL in x;
  }

  static of(construct: IConstruct): SolarSystemCoreStack {
    const scopes = [construct, ...construct.node.scopes];
    for (const scope of scopes) {
      if (SolarSystemCoreStack.isSolarSystemCore(scope)) return scope;
    }

    throw new Error(`No Galaxy Core Stack could be identified for the construct at path ${construct.node.path}`);
  }
}
