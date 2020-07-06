import { CfnResource } from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core/lib/construct-compat';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Stack, StackProps } from '@aws-cdk/core/lib/stack';
import { PATTERN, COSMOS_PARTITION, COSMOS_VERSION, COSMOS_NETWORK_BUILDER, AWS_ENV } from '../helpers/constants';
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

    if (partition) this.node.setContext(COSMOS_PARTITION, partition);
    if (version) this.node.setContext(COSMOS_VERSION, version);

    this.hidden = new Construct(this, 'Default');
  }
}

export interface BaseStackProps extends BaseConstructProps, StackProps {
  disableCosmosNaming?: boolean;
  cidr?: string;
}

export class BaseStack extends Stack {
  private readonly disableCosmosNaming: boolean;
  protected readonly hidden: Construct;
  public readonly networkBuilder?: NetworkBuilder;

  constructor(scope: Construct, id: string, props?: BaseStackProps) {
    const { type, context, partition, version, disableCosmosNaming = false, env, cidr } = props || {};
    const stackName = generateNodeId({ scope, id, type, partition, version, pattern: PATTERN.STACK });

    super(scope, id, {
      stackName,
      env: scope.node.tryGetContext(AWS_ENV),
      ...props,
    });

    this.node.type = type;
    this.disableCosmosNaming = disableCosmosNaming;

    if (context) {
      Object.entries(context).forEach(([key, value]) => this.node.setContext(key, value));
    }

    if (partition) this.node.setContext(COSMOS_PARTITION, partition);
    if (version) this.node.setContext(COSMOS_VERSION, version);
    if (env) this.node.setContext(AWS_ENV, env);

    if (cidr) this.networkBuilder = new NetworkBuilder(cidr);
    if (this.networkBuilder) this.node.setContext(COSMOS_NETWORK_BUILDER, this.networkBuilder);
    else this.networkBuilder = this.node.tryGetContext(COSMOS_NETWORK_BUILDER);

    this.hidden = new Construct(this, 'Default');
  }

  public allocateLogicalId(scope: CfnResource): string {
    if (this.disableCosmosNaming) return super.allocateLogicalId(scope);
    const id = generateScopeId({ scope, defaultPattern: PATTERN.RESOURCE });
    return removeNonAlphanumeric(id);
  }
}

declare module '@aws-cdk/core/lib/construct-compat' {
  interface ConstructNode {
    type?: string;
    pattern?: string;
  }

  interface Construct {
    nodeId(id?: string, delimiter?: string, pattern?: string, type?: string): string;
    singletonId(id?: string, delimiter?: string, type?: string): string;
  }
}

Construct.prototype.nodeId = function(id, delimiter, pattern, type): string {
  return generateNodeId({ scope: this, pattern, id, type, delimiter });
};

Construct.prototype.singletonId = function(id, delimiter, type): string {
  return generateSingletonId({ scope: this, id, type, delimiter });
};

const removeNonAlphanumeric = (s: string): string => {
  return s.replace(/[^A-Za-z0-9]/g, '');
};
