import { Construct } from '@aws-cdk/core';
import {
  VpcProps,
  Vpc,
  SubnetType,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  IVpc,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointOptions,
  CfnDHCPOptions,
  CfnVPCDHCPOptionsAssociation,
} from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { IHostedZone, PrivateHostedZone } from '@aws-cdk/aws-route53';

export interface ICoreVpc extends IVpc {
  readonly zone?: IHostedZone;
  readonly disableEndpoints?: boolean;
}

export interface CoreVpcProps extends Partial<VpcProps> {
  networkBuilder: NetworkBuilder;
  cidrMask?: number;
  subnetMask?: number;
  disableEndpoints?: boolean;
}

export class CoreVpc extends Vpc implements ICoreVpc {
  readonly zone: PrivateHostedZone;
  readonly disableEndpoints: boolean;

  constructor(scope: Construct, id: string, props: CoreVpcProps) {
    const { networkBuilder, cidrMask = 24, subnetMask = 26, disableEndpoints } = props;

    super(scope, id, {
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'App',
          subnetType: SubnetType.ISOLATED,
          cidrMask: subnetMask,
        },
      ],
      ...props,
      cidr: networkBuilder.addSubnet(cidrMask),
    });

    this.disableEndpoints = disableEndpoints ?? false;

    this.addGatewayEndpoint('S3Gateway', {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetGroupName: 'App' }],
    });

    this.zone = new PrivateHostedZone(this, 'PrivateZone', {
      vpc: this,
      zoneName: 'internal',
      comment: `Vpc Private Zone for ${this.nodeId()}`,
    });

    const dhcp = new CfnDHCPOptions(this, 'Dhcp', {
      domainName: this.zone.zoneName,
      domainNameServers: ['AmazonProvidedDNS'],
    });

    new CfnVPCDHCPOptionsAssociation(this, 'DhcpAssociation', {
      vpcId: this.vpcId,
      dhcpOptionsId: dhcp.ref,
    });
  }

  static addCommonEndpoints(vpc: ICoreVpc): void {
    if (!vpc.disableEndpoints) {
      tryAddInterfaceEndpoint(vpc, 'SsmEndpoint', {
        service: InterfaceVpcEndpointAwsService.SSM,
        subnets: { subnetGroupName: 'App' },
      });
      tryAddInterfaceEndpoint(vpc, 'SsmMessageEndpoint', {
        service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        subnets: { subnetGroupName: 'App' },
      });
      tryAddInterfaceEndpoint(vpc, 'CloudWatchLogsEndpoint', {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: { subnetGroupName: 'App' },
      });
    }
  }

  static addEcsEndpoints(vpc: ICoreVpc): void {
    if (!vpc.disableEndpoints) {
      tryAddInterfaceEndpoint(vpc, 'EcsEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS,
        subnets: { subnetGroupName: 'App' },
      });
      tryAddInterfaceEndpoint(vpc, 'EcsAgentEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS_AGENT,
        subnets: { subnetGroupName: 'App' },
      });
      tryAddInterfaceEndpoint(vpc, 'EcsTelemetryEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
        subnets: { subnetGroupName: 'App' },
      });
      tryAddInterfaceEndpoint(vpc, 'EcrEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECR,
        subnets: { subnetGroupName: 'App' },
      });
      tryAddInterfaceEndpoint(vpc, 'EcrDockerEndpoint', {
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: { subnetGroupName: 'App' },
      });
    }
  }
}

const tryAddInterfaceEndpoint = (
  vpc: IVpc,
  id: string,
  options: InterfaceVpcEndpointOptions
): InterfaceVpcEndpoint | undefined => {
  if (!vpc.node.tryFindChild(id)) {
    return vpc.addInterfaceEndpoint(id, options);
  }
  return undefined;
};
