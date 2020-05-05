import { Construct } from '@aws-cdk/core';
import { VpcProps, Vpc, SubnetType, GatewayVpcEndpointAwsService } from '@aws-cdk/aws-ec2';
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
