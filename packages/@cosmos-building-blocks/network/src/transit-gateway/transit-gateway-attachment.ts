import { Construct, Resource, IResource } from '@aws-cdk/core';
import { IVpc, CfnTransitGatewayAttachment, ISubnet, SubnetSelection, CfnRoute } from '@aws-cdk/aws-ec2';
import { ITransitGateway } from './transit-gateway';

export interface ITransitGatewayAttachment extends IResource {
  attachmentId: string;
  gateway: ITransitGateway;
  vpc: IVpc;
  subnets: ISubnet[];
  addRoute(id: string, props: { destinationCidrBlock: string }): void;
}

export interface TransitGatewayAttachmentProps {
  gateway: ITransitGateway;
  vpc: IVpc;
  subnets: SubnetSelection[];
}

export class TransitGatewayAttachment extends Resource implements ITransitGatewayAttachment {
  private readonly resource: CfnTransitGatewayAttachment;
  public readonly attachmentId: string;
  public readonly gateway: ITransitGateway;
  public readonly vpc: IVpc;
  public readonly subnets: ISubnet[];

  constructor(scope: Construct, id: string, props: TransitGatewayAttachmentProps) {
    super(scope, id);

    const { gateway, vpc, subnets } = props;

    this.gateway = gateway;
    this.vpc = vpc;
    this.subnets = subnets
      .map(selection => this.vpc.selectSubnets(selection))
      .reduce<ISubnet[]>((subnets, selection) => {
        subnets.push(...selection.subnets.filter(x => !subnets.includes(x)));
        return subnets;
      }, []);

    this.resource = new CfnTransitGatewayAttachment(this, 'Resource', {
      transitGatewayId: this.gateway.gatewayId,
      vpcId: this.vpc.vpcId,
      subnetIds: this.subnets.map(x => x.subnetId),
    });

    this.attachmentId = this.resource.ref;
    this.node.addDependency(this.gateway);
  }

  public addRoute(id: string, props: { destinationCidrBlock: string }): void {
    const { destinationCidrBlock } = props;

    for (const subnet of this.subnets) {
      const route = new TransitGatewayRoute(this, `${id}-${subnet.node.id}`, {
        attachment: this,
        subnet: subnet,
        destinationCidrBlock: destinationCidrBlock,
      });

      route.node.addDependency(this.resource);
    }
  }
}

export interface TransitGatewayRouteProps {
  attachment: ITransitGatewayAttachment;
  subnet: ISubnet;
  destinationCidrBlock: string;
}

export class TransitGatewayRoute extends Resource {
  private readonly resource: CfnRoute;
  public readonly attachment: ITransitGatewayAttachment;
  public readonly subnet: ISubnet;
  public readonly destinationCidrBlock: string;

  constructor(scope: Construct, id: string, props: TransitGatewayRouteProps) {
    super(scope, id);

    const { attachment, subnet, destinationCidrBlock } = props;

    this.attachment = attachment;
    this.subnet = subnet;
    this.destinationCidrBlock = destinationCidrBlock;

    this.resource = new CfnRoute(this, 'Resource', {
      routeTableId: this.subnet.routeTable.routeTableId,
      destinationCidrBlock: this.destinationCidrBlock,
      transitGatewayId: this.attachment.gateway.gatewayId,
    });

    if (this.node.scope !== this.attachment) {
      this.resource.node.addDependency(this.attachment);
    }
  }
}
