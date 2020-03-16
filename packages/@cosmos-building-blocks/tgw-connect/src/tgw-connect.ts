import { Construct } from '@aws-cdk/core';
import { IVpc, CfnRoute, CfnTransitGatewayAttachment } from '@aws-cdk/aws-ec2';
import { CfnResolverRuleAssociation } from '@aws-cdk/aws-route53resolver';

export interface TgwConnectProps {
  vpc: IVpc;
  transitGatewayId: string;
  tgwDestinationCidr: string;
  resolverRuleId: string;
}

export class TgwConnect extends Construct {
  readonly Vpc: IVpc;
  readonly TgwId: string;
  readonly TgwDestinationCidr: string;
  readonly ResolverRuleId: string;

  constructor(scope: Construct, id: string, props: TgwConnectProps) {
    super(scope, id);

    this.Vpc = props.vpc;
    this.TgwId = props.transitGatewayId;
    this.TgwDestinationCidr = props.tgwDestinationCidr;
    this.ResolverRuleId = props.resolverRuleId;

    const subnetSelect = this.Vpc.selectSubnets();
    for (const subnet of subnetSelect.subnets) {
      const random = Math.random()
        .toString(36)
        .substring(4);
      new CfnRoute(this, `TGWRoute-${random}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: this.TgwDestinationCidr,
        transitGatewayId: this.TgwId,
      });
    }

    new CfnResolverRuleAssociation(this, 'ResolverRuleAssociation', {
      resolverRuleId: this.ResolverRuleId,
      vpcId: this.Vpc.vpcId,
    });

    new CfnTransitGatewayAttachment(this, 'TransitGatewayAttachment', {
      subnetIds: subnetSelect.subnetIds,
      transitGatewayId: this.TgwId,
      vpcId: this.Vpc.vpcId,
    });
  }
}
