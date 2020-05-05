import { IConstruct, CfnResource } from '@aws-cdk/core';
import { Construct, ConstructNode } from '@aws-cdk/core/lib/construct-compat';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Stack, StackProps } from '@aws-cdk/core/lib/stack';

export const COSMOS_PARTITION = 'COSMOS_PARTITION';
export const COSMOS_VERSION = 'COSMOS_VERSION';
export const COSMOS_NETWORK_BUILDER = 'COSMOS_NETWORK_BUILDER';
export const AWS_ENV = 'AWS_ENV';

export const PATTERN = {
  SINGLETON_COSMOS: '{Partition}{Resource}+',
  SINGLETON_GALAXY: '{Partition}{Galaxy}{Resource}+',
  SINGLETON_SOLAR_SYSTEM: '${Partition}{Galaxy}{SolarSystem}{Resource}+',
  STACK: '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Version}?{Type}',
  COSMOS: '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Resource}*{Version}?',
  RESOURCE: '{Resource}+{Version}?',
  // SHORT_SOLAR_SYSTEM: '{Partition}{Cosmos}{SolarSystem}{Resource}+',
  // DOCKER_TAG: '{Cosmos}/{Resource}+',
  // LOG_GROUP: '{Partition}/{Cosmos}/{SolarSystem}/{Resource}+',
};

declare module '@aws-cdk/core/lib/construct-compat' {
  interface ConstructNode {
    id: string;
    type: string;
    pattern: string;
  }

  interface Construct {
    generateId(id: string, delimiter?: string, pattern?: string, type?: string): string;
    singletonId(id: string, delimiter?: string, type?: string): string;
  }
}

ConstructNode.prototype.type = 'Resource';

Construct.prototype.generateId = function(id, delimiter, pattern, type): string {
  return generateNodeId({
    scope: this,
    pattern,
    id,
    type,
    delimiter,
  });
};

Construct.prototype.singletonId = function(id, delimiter, type): string {
  return singletonNodeId({
    scope: this,
    id,
    type,
    delimiter,
  });
};

export interface BaseStackProps extends StackProps {
  partition?: string;
  version?: string;
  type: string;
  disableCosmosNaming?: boolean;
  cidr?: string;
}

export class BaseStack extends Stack {
  private readonly disableCosmosNaming: boolean;
  public readonly networkBuilder?: NetworkBuilder;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const { partition, version, type, disableCosmosNaming = false, env, cidr } = props;

    super(scope, id, {
      stackName: generateNodeId({ scope, id, type, partition, version, pattern: PATTERN.STACK }),
      env: scope.node.tryGetContext(AWS_ENV),
      ...props,
    });

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

    const id = generateId({
      scopes: getScopes(scope),
      pattern: getPattern(scope) || PATTERN.RESOURCE,
      partition: scope.node.tryGetContext(COSMOS_PARTITION),
      version: scope.node.tryGetContext(COSMOS_VERSION),
    });

    return removeNonAlphanumeric(id);
  }
}

export function singletonNodeId(props: { scope: IConstruct; id: string; type?: string; delimiter?: string }): string {
  const { scope, id, type, delimiter } = props;
  let pattern: string;
  switch (scope.node.type) {
    case 'Cosmos':
      pattern = PATTERN.SINGLETON_COSMOS;
      break;
    case 'Galaxy':
      pattern = PATTERN.SINGLETON_GALAXY;
      break;
    case 'SolarSystem':
      pattern = PATTERN.SINGLETON_SOLAR_SYSTEM;
      break;
    default:
      throw new Error(`Singleton Pattern could not be found for ${scope.node.id}`);
  }
  return generateNodeId({
    scope,
    pattern,
    id,
    type,
    delimiter,
  });
}

export function generateNodeId(props: {
  scope: IConstruct;
  id: string;
  pattern?: string;
  type?: string;
  partition?: string;
  version?: string;
  delimiter?: string;
}): string {
  const { scope, id, pattern, type = 'Resource', partition, version, delimiter } = props;
  return generateId({
    scopes: [...getScopes(scope), { key: type, value: id }, { key: 'Type', value: type }],
    pattern: pattern || PATTERN.COSMOS,
    partition: partition || scope.node.tryGetContext(COSMOS_PARTITION),
    version: version || scope.node.tryGetContext(COSMOS_VERSION),
    delimiter,
  });
}

interface IScope {
  key: string;
  value: string;
}

interface GenerateLogicalIdProps {
  scopes: IScope[];
  pattern: string;
  partition?: string;
  version?: string;
  delimiter?: string;
}

export function generateId(props: GenerateLogicalIdProps): string {
  const { scopes, pattern, partition, version, delimiter = '' } = props;

  if (partition) scopes.push({ key: 'Partition', value: partition });
  if (version) scopes.push({ key: 'Version', value: version });

  const selectedIds = selectScoped(scopes.filter(removeHidden), pattern)
    .map(x => x.value)
    .reduce(removeDupes, []);

  return selectedIds.join(delimiter).slice(0, 240);
}

function selectScoped(scopes: IScope[], pattern: string): IScope[] {
  const regex = /{(\w+)}([*+?])?/gm;
  const results: IScope[] = [];
  let segment: RegExpExecArray | null;
  while ((segment = regex.exec(pattern)) !== null) {
    const key: string = segment[1];
    const selector: string | undefined = segment[2];

    switch (selector) {
      case '*': {
        const selected = scopes.filter(x => x.key === key);
        if (selected.length) results.push(...selected);
        break;
      }
      case '+': {
        if (!scopes.some(x => x.key === key)) throw new Error(`No ${key} Scope found`);
        results.push(...scopes.filter(x => x.key === key));
        break;
      }
      case '?': {
        const selected = scopes.filter(x => x.key === key).pop();
        if (selected) results.push(selected);
        break;
      }
      default: {
        const selected = scopes.filter(x => x.key === key).pop();
        if (!selected) throw new Error(`No ${key} Scope found.`);
        results.push(selected);
      }
    }
  }

  return results;
}

function getScopes(scope: IConstruct): IScope[] {
  const scopes = scope.node.scopes
    .filter(x => x.node.id && x.node.type)
    .map(x => ({
      key: x.node.type,
      value: x.node.id,
    }));

  if (scope.node.type) scopes.push({ key: 'Type', value: scope.node.type });

  return scopes;
}

function getPattern(scope: IConstruct): string | undefined {
  return scope.node.scopes
    .map(x => x.node.pattern)
    .filter(x => x)
    .pop();
}

function removeDupes(result: string[], value: string): string[] {
  if (result.length === 0 || !result[result.length - 1].endsWith(value)) {
    result.push(value);
  }

  return result;
}

function removeHidden(scope: IScope): boolean {
  if (scope.value === 'Default' || scope.value === 'Resource') return false;
  return true;
}

function removeNonAlphanumeric(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, '');
}
