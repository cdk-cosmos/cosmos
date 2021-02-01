import { HostedZone } from '@aws-cdk/aws-route53';
import { IVpc } from '@aws-cdk/aws-ec2';
import { RemoteZone } from '../../components/remote';
import { CosmosCoreStack, ICosmosCore } from '../../cosmos/cosmos-core-stack';
import { CosmosExtensionStack, ICosmosExtension } from '../../cosmos/cosmos-extension-stack';

export interface DomainProps {
  /**
   * Top Level Domain Name
   *
   * You can add Sub Domain names via `addSubDomain()`
   */
  readonly tld: string;
  /**
   * Export name for the Subdomain
   */
  readonly exportName: string;
  /**
   * A VPC that you want to associate with this hosted zone.
   *
   * When you specify
   * this property, a private hosted zone will be created.
   *
   * You can associate additional VPCs to this private zone using `addVpc(vpc)`.
   *
   * @default public (no VPCs associated)
   */
  readonly vpcs?: IVpc[];
  /**
   * The Amazon Resource Name (ARN) for the log group that you want Amazon Route 53 to send query logs to.
   *
   * @default disabled
   */
  readonly queryLogsLogGroupArn?: string;
}

export class Domain extends HostedZone {
  readonly scope: ICosmosCore | ICosmosExtension;
  readonly export: RemoteZone;

  constructor(scope: ICosmosCore | ICosmosExtension, id: string, props: DomainProps) {
    super(scope, id, {
      zoneName: props.tld,
      vpcs: props.vpcs,
      queryLogsLogGroupArn: props.queryLogsLogGroupArn,
      comment: `Root Domain form ${props.tld}`,
    });

    const { exportName } = props;

    this.scope = scope;

    this.export = new RemoteZone(this, exportName);
  }
}

declare module '../../cosmos/cosmos-core-stack' {
  export interface CosmosCoreStack {
    addDomain(id: string, tld: string): Domain;
  }
}

declare module '../../cosmos/cosmos-extension-stack' {
  export interface CosmosExtensionStack {
    addDomain(id: string, tld: string): Domain;
  }
}

CosmosCoreStack.prototype.addDomain = function (id, tld): Domain {
  const resource = new Domain(this, id, {
    tld: tld,
    exportName: this.singletonId(id),
  });
  return resource;
};

CosmosExtensionStack.prototype.addDomain = function (id, tld): Domain {
  const resource = new Domain(this, id, {
    tld: tld,
    exportName: this.nodeId(id),
  });
  return resource;
};
