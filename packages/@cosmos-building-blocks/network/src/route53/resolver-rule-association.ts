import { Resource, Construct, IResource } from '@aws-cdk/core';
import { CfnResolverRuleAssociation } from '@aws-cdk/aws-route53resolver';
import { IVpc } from '@aws-cdk/aws-ec2';
import { IResolverRule } from './resolver-rule';

export interface IResolverRuleAssociation extends IResource {
  associationId: string;
}

export interface ResolverRuleAssociationProps {
  resolver: IResolverRule;
  vpc: IVpc;
  name?: string;
}

export class ResolverRuleAssociation extends Resource implements IResolverRuleAssociation {
  private readonly resource: CfnResolverRuleAssociation;
  public readonly associationId: string;

  constructor(scope: Construct, id: string, props: ResolverRuleAssociationProps) {
    super(scope, id, { physicalName: props.name });

    const { resolver, vpc } = props;

    this.resource = new CfnResolverRuleAssociation(this, 'Resource', {
      resolverRuleId: resolver.ruleId,
      vpcId: vpc.vpcId,
      name: this.physicalName,
    });
    this.associationId = this.resource.ref;
  }
}
