import { Construct } from '@aws-cdk/core';
import {
  VpcProps,
  Vpc,
  SubnetType,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
} from '@aws-cdk/aws-ec2';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';

export interface CoreVpcProps extends Partial<VpcProps> {
  networkBuilder: NetworkBuilder;
  cidrMask?: number;
  subnetMask?: number;
}

export class CoreVpc extends Vpc {
  constructor(scope: Construct, id: string, props: CoreVpcProps) {
    const { networkBuilder, cidrMask = 24, subnetMask = 26 } = props;

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

    this.addGatewayEndpoint('S3Gateway', {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetGroupName: 'App' }],
    });
  }
}

export function addCommonEndpoints(vpc: Vpc): void {
  vpc.addInterfaceEndpoint('SsmEndpoint', {
    service: InterfaceVpcEndpointAwsService.SSM,
    subnets: { subnetGroupName: 'App' },
  });
  vpc.addInterfaceEndpoint('SsmMessageEndpoint', {
    service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    subnets: { subnetGroupName: 'App' },
  });
  vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
    service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    subnets: { subnetGroupName: 'App' },
  });
}

export function addEcsEndpoints(vpc: Vpc): void {
  vpc.addInterfaceEndpoint('EcsEndpoint', {
    service: InterfaceVpcEndpointAwsService.ECS,
    subnets: { subnetGroupName: 'App' },
  });
  vpc.addInterfaceEndpoint('EcsAgentEndpoint', {
    service: InterfaceVpcEndpointAwsService.ECS_AGENT,
    subnets: { subnetGroupName: 'App' },
  });
  vpc.addInterfaceEndpoint('EcsTelemetryEndpoint', {
    service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
    subnets: { subnetGroupName: 'App' },
  });
  vpc.addInterfaceEndpoint('EcrEndpoint', {
    service: InterfaceVpcEndpointAwsService.ECR,
    subnets: { subnetGroupName: 'App' },
  });
  vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
    service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
    subnets: { subnetGroupName: 'App' },
  });
}
