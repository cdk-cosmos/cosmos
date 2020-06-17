import { CfnResource } from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core/lib/construct-compat';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Stack, StackProps } from '@aws-cdk/core/lib/stack';
import { PATTERN, COSMOS_PARTITION, COSMOS_VERSION, COSMOS_NETWORK_BUILDER, AWS_ENV } from '../helpers/constants';
import { generateNodeId, generateScopeId, generateSingletonId } from '../helpers/generate-scope-id';

export interface BaseConstructProps {
  name?: string;
  type?: string;
  partition?: string;
  version?: string;
}

export class BaseConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: BaseConstructProps) {
    super(scope, id);

    const { name, type, partition, version } = props || {};

    this.node.name = name;
    this.node.name = name;
    this.node.type = type;

    if (partition) this.node.setContext(COSMOS_PARTITION, partition);
    if (version) this.node.setContext(COSMOS_VERSION, version);
  }
}

export interface BaseStackProps extends BaseConstructProps, StackProps {
  disableCosmosNaming?: boolean;
  cidr?: string;
}

export class BaseStack extends Stack {
  private readonly disableCosmosNaming: boolean;
  public readonly networkBuilder?: NetworkBuilder;

  constructor(scope: Construct, id: string, props?: BaseStackProps) {
    const { name, partition, version, type, disableCosmosNaming = false, env, cidr } = props || {};
    const stackName = generateNodeId({ scope, name: name || id, type, partition, version, pattern: PATTERN.STACK });

    super(scope, id, {
      stackName,
      env: scope.node.tryGetContext(AWS_ENV),
      ...props,
    });

    this.node.name = name;
    this.node.type = type;
    this.disableCosmosNaming = disableCosmosNaming;

    if (partition) this.node.setContext(COSMOS_PARTITION, partition);
    if (version) this.node.setContext(COSMOS_VERSION, version);
    if (env) this.node.setContext(AWS_ENV, env);

    if (cidr) this.networkBuilder = new NetworkBuilder(cidr);
    if (this.networkBuilder) this.node.setContext(COSMOS_NETWORK_BUILDER, this.networkBuilder);
    else this.networkBuilder = this.node.tryGetContext(COSMOS_NETWORK_BUILDER);
  }

  public allocateLogicalId(scope: CfnResource): string {
    if (this.disableCosmosNaming) return super.allocateLogicalId(scope);
    const id = generateScopeId({ scope, defaultPattern: PATTERN.RESOURCE });
    return removeNonAlphanumeric(id);
  }
}

export interface IBaseExtension<T extends Construct> extends Construct {
  portal: T;
}

export interface BaseExtensionStackProps<P extends BaseConstructProps = BaseConstructProps> extends BaseStackProps {
  portalProps?: P;
}

export abstract class BaseExtensionStack<T extends Construct> extends BaseStack implements IBaseExtension<T> {
  readonly portal: T;

  constructor(scope: Construct, id: string, props?: BaseExtensionStackProps) {
    super(scope, id, props);

    this.portal = this.getPortal(props);
  }

  protected abstract getPortal(props?: BaseExtensionStackProps): T;
}

declare module '@aws-cdk/core/lib/construct-compat' {
  interface ConstructNode {
    name?: string;
    type?: string;
    pattern?: string;
  }

  interface Construct {
    nodeId(name?: string, delimiter?: string, pattern?: string, type?: string): string;
    singletonId(name?: string, delimiter?: string, type?: string): string;
  }
}

Construct.prototype.nodeId = function(name, delimiter, pattern, type): string {
  return generateNodeId({ scope: this, pattern, name, type, delimiter });
};

Construct.prototype.singletonId = function(name, delimiter, type): string {
  return generateSingletonId({ scope: this, name, type, delimiter });
};

const removeNonAlphanumeric = (s: string): string => {
  return s.replace(/[^A-Za-z0-9]/g, '');
};
