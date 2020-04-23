import { Construct, Resource, IResource } from '@aws-cdk/core';
import { CfnTransitGateway, IVpc, SubnetSelection } from '@aws-cdk/aws-ec2';
import { TransitGatewayAttachment, ITransitGatewayAttachment } from './transit-gateway-attachment';

export interface ITransitGateway extends IResource {
  gatewayId: string;
  addAttachment(id: string, props: { vpc: IVpc; subnets: SubnetSelection[] }): ITransitGatewayAttachment;
}

abstract class TransitGatewayBase extends Resource implements ITransitGateway {
  public abstract readonly gatewayId: string;

  public addAttachment(id: string, props: { vpc: IVpc; subnets: SubnetSelection[] }): TransitGatewayAttachment {
    return new TransitGatewayAttachment(this, id, {
      ...props,
      gateway: this,
    });
  }
}

export interface TransitGatewayProps {
  // TODO:
  amazonSideAsn?: number;
  autoAcceptSharedAttachments?: string;
  defaultRouteTableAssociation?: string;
  defaultRouteTablePropagation?: string;
  description?: string;
  dnsSupport?: string;
  vpnEcmpSupport?: string;
}

export class TransitGateway extends TransitGatewayBase {
  private readonly resource: CfnTransitGateway;
  public readonly gatewayId: string;

  constructor(scope: Construct, id: string, props: TransitGatewayProps) {
    super(scope, id);

    this.resource = new CfnTransitGateway(this, 'Resource', props);
    this.gatewayId = this.resource.ref;
  }

  public static fromGatewayAttributes(
    scope: Construct,
    id: string,
    props: ImportedTransitGatewayAttributes
  ): ITransitGateway {
    return new ImportedTransitGateway(scope, id, props);
  }
}

interface ImportedTransitGatewayAttributes {
  gatewayId: string;
}

class ImportedTransitGateway extends TransitGatewayBase {
  public readonly gatewayId: string;

  constructor(scope: Construct, id: string, props: ImportedTransitGatewayAttributes) {
    super(scope, id, {
      physicalName: props.gatewayId,
    });

    this.gatewayId = this.physicalName;
  }
}
