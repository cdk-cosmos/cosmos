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
import { isCrossAccount, defaultProps, DeepPartial } from '../helpers/utils';
import { BaseStack, BaseStackProps } from '../components/base';
import { IGalaxyCore } from '../galaxy/galaxy-core-stack';
import { CoreVpc, CoreVpcProps, addCommonEndpoints } from '../components/core-vpc';
import { CrossAccountZoneDelegationRecord } from '../components/cross-account';
import { RemoteVpc, RemoteZone } from '../helpers/remote';
import { IEcsSolarSystemCore, EcsSolarSystemCoreStack, EcsSolarSystemCoreProps } from './feature';

export interface ISolarSystemCore extends Construct {
  readonly galaxy: IGalaxyCore;
  readonly vpc: IVpc;
  readonly zone: IPublicHostedZone;
  readonly privateZone: IPrivateHostedZone;
  readonly networkBuilder?: NetworkBuilder;
  readonly certificate?: Certificate;
  readonly ecs?: IEcsSolarSystemCore;
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
  readonly props: SolarSystemCoreStackProps;
  readonly vpc: Vpc;
  readonly zone: PublicHostedZone;
  readonly privateZone: PrivateHostedZone;
  readonly certificate?: Certificate;
  ecs?: EcsSolarSystemCoreStack;

  constructor(galaxy: IGalaxyCore, id: string, props?: SolarSystemCoreStackProps) {
    props = defaultProps<SolarSystemCoreStackProps>(
      {
        description: 'Cosmos SolarSystem: Resources dependant on each App Env, like Vpc and MainZone.',
        certificate: false,
        vpcProps: {
          defaultEndpoints: true,
        },
        zoneProps: {
          linkZone: true,
          ttl: Duration.minutes(30),
        },
      },
      props,
      {
        type: 'SolarSystem',
      }
    );
    super(galaxy, id, props);

    this.galaxy = galaxy;
    this.props = props;

    if (this.props.vpc) this.vpc = this.props.vpc as Vpc;
    else {
      if (!this.networkBuilder) {
        throw new Error(
          `NetworkBuilder not found, please define cidr range here (SolarSystem: ${this.node.id}) or Galaxy or Cosmos.`
        );
      }

      this.vpc = new CoreVpc(this, 'Vpc', {
        ...this.props.vpcProps,
        networkBuilder: this.networkBuilder,
      });
    }

    // Only add endpoints if this component owens the Vpc.
    if (this.vpc.node.scope === this) {
      if (this.props.vpcProps?.defaultEndpoints) addCommonEndpoints(this.vpc);
    }

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

    if (this.props.certificate) {
      this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
        hostedZone: this.zone,
        domainName: this.zone.zoneName,
        subjectAlternativeNames:
          typeof this.props.certificate === 'object'
            ? this.props.certificate.subDomains.map(x => `${x}.${this.zone.zoneName}`)
            : undefined,
      });
    }

    if (this.props.zoneProps?.linkZone) {
      if (isCrossAccount(this.zone, rootZone)) {
        new CrossAccountZoneDelegationRecord(this, 'ZoneDelegation', {
          ttl: this.props.zoneProps?.ttl,
          comment: `Core Zone Delegation for ${this.node.id} SolarSystem.`,
        });
      } else {
        new ZoneDelegationRecord(this, 'ZoneDelegation', {
          zone: rootZone,
          recordName: this.zone.zoneName,
          nameServers: this.zone.hostedZoneNameServers as string[],
          ttl: this.props.zoneProps?.ttl,
          comment: `Core Zone Delegation for ${this.node.id} SolarSystem.`,
        });
      }
    }

    RemoteVpc.export(this.vpc, this.singletonId('Vpc'), this);
    RemoteZone.export(this.zone, this.singletonId('Zone'));
    RemoteZone.export(this.privateZone, this.singletonId('PrivateZone'));

    Tag.add(this, 'cosmos:solarsystem', this.node.id);
  }

  addEcs(props?: DeepPartial<EcsSolarSystemCoreProps>): EcsSolarSystemCoreStack {
    this.ecs = new EcsSolarSystemCoreStack(this, 'Ecs', defaultProps(this.props, props));
    return this.ecs;
  }
}
