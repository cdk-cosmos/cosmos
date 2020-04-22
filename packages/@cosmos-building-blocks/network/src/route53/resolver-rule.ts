import { Resource, Construct, ResourceProps, IResolvable, IResource } from '@aws-cdk/core';
import { CfnResolverRule } from '@aws-cdk/aws-route53resolver';
import { IVpc } from '@aws-cdk/aws-ec2';
import { ResolverRuleAssociation } from './resolver-rule-association';

export interface IResolverRule extends IResource {
  ruleId: string;
}

abstract class ResolverRuleBase extends Resource implements IResolverRule {
  public abstract readonly ruleId: string;

  public addAssociation(id: string, props: { vpc: IVpc; name?: string }): ResolverRuleAssociation {
    return new ResolverRuleAssociation(this, id, {
      ...props,
      resolver: this,
    });
  }
}

export interface ResolverRuleProps extends ResourceProps {
  readonly domainName: string;
  readonly ruleType: string;
  readonly name?: string;
  readonly resolverEndpointId?: string;
  readonly targetIps?: Array<CfnResolverRule.TargetAddressProperty | IResolvable> | IResolvable;
}

export class ResolverRule extends ResolverRuleBase {
  private readonly resource: CfnResolverRule;
  public readonly ruleId: string;

  constructor(scope: Construct, id: string, props: ResolverRuleProps) {
    super(scope, id, { physicalName: props.name });

    this.resource = new CfnResolverRule(this, 'Resource', { ...props, name: this.physicalName });
    this.ruleId = this.resource.ref;
  }

  public static fromResolverAttributes(scope: Construct, id: string, props: ResolverRuleAttributes): IResolverRule {
    return new ImportedResolverRule(scope, id, props);
  }
}

interface ResolverRuleAttributes {
  ruleId: string;
}

class ImportedResolverRule extends ResolverRuleBase {
  public ruleId: string;

  constructor(scope: Construct, id: string, props: ResolverRuleAttributes) {
    super(scope, id, { physicalName: props.ruleId });

    this.ruleId = this.physicalName;
  }
}
