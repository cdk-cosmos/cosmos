import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { IVpc, SubnetType, Vpc, GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService } from '@aws-cdk/aws-ec2';
import { IHostedZone, HostedZone, ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { IGalaxy, IGalaxyExtension, ISolarSystem, ISolarSystemExtension, RemoteVpc, RemoteZone } from '.';

export interface SolarSystemProps extends StackProps {
  cidr?: string;
}

export class SolarSystemStack extends Stack implements ISolarSystem {
  readonly Galaxy: IGalaxy;
  readonly Name: string;
  readonly Vpc: Vpc;
  readonly Zone: HostedZone;

  constructor(galaxy: IGalaxy, name: string, props?: SolarSystemProps) {
    super(galaxy.Cosmos.Scope, `Cosmos-Core-Galaxy-${galaxy.Name}-SolarSystem-${name}`, {
      ...props,
      env: {
        account: props?.env?.account || galaxy.account,
        region: props?.env?.region || galaxy.region,
      },
    });

    const { cidr } = props || {};

    this.Galaxy = galaxy;
    this.Galaxy.AddSolarSystem(this);
    this.Name = name;

    this.Vpc = this.Galaxy.node.tryFindChild('SharedVpc') as Vpc;
    if (!this.Vpc) {
      if (!cidr) {
        throw new Error(`Cidr is required for first app env defined in the galaxy (Env: ${this.Name}?).`);
      }

      this.Vpc = new Vpc(this.Galaxy, 'SharedVpc', {
        cidr: cidr,
        maxAzs: 3,
        subnetConfiguration: [
          {
            name: 'Main',
            subnetType: SubnetType.ISOLATED,
            cidrMask: 26,
          },
        ],
      });

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

      RemoteVpc.export(`Cosmos${this.Galaxy.Name}Core`, this.Vpc);
    }

    const rootZoneName = this.Galaxy.Cosmos.RootZone.zoneName;
    this.Zone = new HostedZone(this, 'Zone', {
      zoneName: `${name}.${rootZoneName}`.toLowerCase(),
    });

    // new ZoneDelegationRecord(this, 'ZoneDelegation', {
    //   zone: this.Account.Project.Zone,
    //   recordName: this.Zone.zoneName,
    //   nameServers: this.Zone.hostedZoneNameServers as string[],
    // }); // TODO: Cross Account ZoneDelegationRecord

    RemoteZone.export(`Cosmos${this.Galaxy.Name}${this.Name}Core`, this.Zone);
  }
}

export class ImportedSolarSystem extends Construct implements ISolarSystem {
  readonly Galaxy: IGalaxy;
  readonly Name: string;
  readonly Vpc: IVpc;
  readonly Zone: IHostedZone;

  constructor(scope: Construct, galaxy: IGalaxy, name: string) {
    super(scope, `Cosmos-Core-Galaxy-${galaxy.Name}-SolarSystem-${name}`);

    this.Galaxy = galaxy;
    this.Name = name;
    this.Vpc = RemoteVpc.import(this, `Cosmos${this.Galaxy.Name}Core`, 'SharedVpc', { hasIsolated: true });
    this.Zone = RemoteZone.import(this, `Cosmos${this.Galaxy.Name}${this.Name}Core`, 'Zone');
  }
}

export class SolarSystemExtensionStack extends Stack implements ISolarSystemExtension {
  readonly Galaxy: IGalaxyExtension;
  readonly Portal: ISolarSystem;
  readonly Name: string;

  constructor(galaxy: IGalaxyExtension, name: string, props?: StackProps) {
    super(galaxy.Cosmos.Scope, `Cosmos-App-${galaxy.Cosmos.Name}-Galaxy-${galaxy.Name}-SolarSystem-${name}`, {
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
