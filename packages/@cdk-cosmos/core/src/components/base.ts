import { CfnElement, NestedStack, NestedStackProps, Tags } from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core/lib/construct-compat';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Stack, StackProps } from '@aws-cdk/core/lib/stack';
import {
  PATTERN,
  CONTEXT_COSMOS_PARTITION,
  CONTEXT_COSMOS_VERSION,
  CONTEXT_COSMOS_NETWORK_BUILDER,
  CONTEXT_COSMOS_NAMING,
  CONTEXT_AWS_ENV,
} from '../helpers/constants';
import { generateNodeId, generateScopeId, generateSingletonId } from '../helpers/generate-scope-id';

export interface BaseConstructProps {
  type?: string;
  context?: Record<string, string>;
  partition?: string;
  version?: string;
}

export class BaseConstruct extends Construct {
  protected readonly hidden: Construct;

  constructor(scope: Construct, id: string, props?: BaseConstructProps) {
    super(scope, id);

    const { type, context, partition, version } = props || {};

    this.node.type = type;

    if (context) {
      Object.entries(context).forEach(([key, value]) => this.node.setContext(key, value));
    }

    if (partition) this.node.setContext(CONTEXT_COSMOS_PARTITION, partition);
    if (version) this.node.setContext(CONTEXT_COSMOS_VERSION, version);

    this.hidden = new Construct(this, 'Default');
  }
}

export interface BaseStackProps extends BaseConstructProps, StackProps {
  cosmosNaming?: boolean;
  cidr?: string;
}

export class BaseStack extends Stack {
  protected readonly hidden: Construct;
  public get cosmosNaming(): boolean {
    return this.node.tryGetContext(CONTEXT_COSMOS_NAMING) || true;
  }
  public get networkBuilder(): NetworkBuilder | undefined {
    return this.node.tryGetContext(CONTEXT_COSMOS_NETWORK_BUILDER);
  }

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const { type, context, partition, version, env, cidr, cosmosNaming } = props;
    const stackName = generateNodeId({ scope, id, type, partition, version, pattern: PATTERN.STACK });

    super(scope, id, {
      stackName,
      env: scope.node.tryGetContext(CONTEXT_AWS_ENV),
      ...props,
    });

    this.node.type = type;

    if (context) {
      Object.entries(context).forEach(([key, value]) => this.node.setContext(key, value));
    }

    if (env) this.node.setContext(CONTEXT_AWS_ENV, env);
    if (partition) this.node.setContext(CONTEXT_COSMOS_PARTITION, partition);
    if (version) this.node.setContext(CONTEXT_COSMOS_VERSION, version);
    if (cosmosNaming) this.node.setContext(CONTEXT_COSMOS_NAMING, cosmosNaming);
    if (cidr) this.node.setContext(CONTEXT_COSMOS_NETWORK_BUILDER, new NetworkBuilder(cidr));

    this.hidden = new Construct(this, 'Default');
  }

  protected allocateLogicalId(scope: CfnElement): string {
    if (!this.cosmosNaming) return super.allocateLogicalId(scope);
    const id = generateScopeId({ scope, defaultPattern: PATTERN.RESOURCE });
    return removeNonAlphanumeric(id);
  }
}

export interface BaseNestedStackProps extends NestedStackProps {
  type?: string;
  description?: string;
}

export class BaseNestedStack extends NestedStack {
  protected readonly hidden: Construct;
  public get cosmosNaming(): boolean {
    return this.node.tryGetContext(CONTEXT_COSMOS_NAMING) || true;
  }
  public get networkBuilder(): NetworkBuilder | undefined {
    return this.node.tryGetContext(CONTEXT_COSMOS_NETWORK_BUILDER);
  }

  constructor(scope: Construct, id: string, props?: BaseNestedStackProps) {
    super(scope, id, props);
    const { type, description } = props || {};

    this.node.type = type;
    this.templateOptions.description = description;
    this.hidden = new Construct(this, 'Default');

    // Change Nested Stack Naming
    this.nestedStackResource?.overrideLogicalId(id);
    (this as any).templateFile = `${this.nestedStackParent?.stackName}${id}.nested.template.json`;
  }

  protected allocateLogicalId(scope: CfnElement): string {
    if (!this.cosmosNaming) return super.allocateLogicalId(scope);
    const id = generateScopeId({ scope, defaultPattern: PATTERN.RESOURCE });
    return removeNonAlphanumeric(id);
  }
}

export interface BaseFeatureStackProps extends BaseNestedStackProps {}

export class BaseFeatureStack extends BaseNestedStack {
  constructor(scope: Construct, id: string, props?: BaseFeatureStackProps) {
    super(scope, id, {
      ...props,
      type: 'Feature',
    });

    Tags.of(this).add('cosmos:feature', this.node.id);
  }
}

export interface BaseFeatureConstructProps extends BaseConstructProps {}

export class BaseFeatureConstruct extends BaseConstruct {
  constructor(scope: Construct, id: string, props?: BaseFeatureConstructProps) {
    super(scope, id, {
      ...props,
      type: 'Feature',
    });

    Tags.of(this).add('cosmos:feature', this.node.id);
  }
}

declare module '@aws-cdk/core/lib/construct-compat' {
  interface ConstructNode {
    type?: string;
    pattern?: string;
  }

  interface Construct {
    evalId(pattern: string): string;
    nodeId(id?: string, delimiter?: string, pattern?: string, type?: string): string;
    singletonId(id?: string, delimiter?: string, type?: string): string;
  }
}

Construct.prototype.evalId = function (pattern): string {
  return generateScopeId({
    scope: this,
    pattern: pattern,
  });
};

Construct.prototype.nodeId = function (id, delimiter, pattern, type): string {
  return generateNodeId({ scope: this, pattern, id, type, delimiter });
};

Construct.prototype.singletonId = function (id, delimiter, type): string {
  return generateSingletonId({ scope: this, id, type, delimiter });
};

const removeNonAlphanumeric = (s: string): string => {
  return s.replace(/[^A-Za-z0-9]/g, '');
};
