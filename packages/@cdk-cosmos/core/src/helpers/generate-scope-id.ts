import { IConstruct } from '@aws-cdk/core';
import { PATTERN, COSMOS_PARTITION, COSMOS_VERSION } from './constants';
import { IKeyValue, nodeId } from './generate-id';

export interface IScope {
  id: string;
  type: string;
  pattern?: string;
}

export function generateSingletonId(props: {
  scope: IConstruct;
  id?: string;
  type?: string;
  delimiter?: string;
}): string {
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
  return generateNodeId({ scope, pattern, id, type, delimiter });
}

export function generateNodeId(props: {
  scope: IConstruct;
  id?: string;
  pattern?: string;
  type?: string;
  partition?: string;
  version?: string;
  delimiter?: string;
}): string {
  const { scope, id, pattern, type = 'Resource', partition, version, delimiter } = props;
  return generateScopeId({
    scope,
    pattern,
    partition,
    version,
    delimiter,
    scopes: id ? [{ id, type }] : [],
    defaultPattern: PATTERN.COSMOS,
  });
}

export const generateScopeId = (props: {
  scope: IConstruct;
  scopes?: IScope[];
  pattern?: string;
  defaultPattern?: string;
  partition?: string;
  version?: string;
  delimiter?: string;
}): string => {
  const { scope, defaultPattern, delimiter = '' } = props;
  const scopes = getScopes(scope);
  if (props.scopes) scopes.push(...props.scopes);

  const context = getContext(scopes);
  const partition = props.partition || scope.node.tryGetContext(COSMOS_PARTITION);
  if (partition) context.push({ key: 'Partition', value: partition });
  const version = props.version || scope.node.tryGetContext(COSMOS_VERSION);
  if (version) context.push({ key: 'Version', value: version });

  const pattern = props.pattern || getPattern(scopes) || defaultPattern;
  if (!pattern) throw new Error('No Pattern was found. Provide one');

  return nodeId({ context, pattern, delimiter });
};

const getScopes = (scope: IConstruct): IScope[] =>
  scope.node.scopes.map(x => x.node).map(x => ({ id: x.id, type: x.type || 'Resource', pattern: x.pattern }));

const getContext = (scopes: IScope[]): IKeyValue[] => {
  return scopes.reduce<IKeyValue[]>((context, scope) => {
    if (scope.id) {
      context.push({ key: scope.type, value: scope.id });
      context.push({ key: 'Type', value: scope.type });
    }
    return context;
  }, []);
};

const getPattern = (scopes: IScope[]): string | undefined => {
  return scopes
    .filter(x => x.pattern)
    .map(x => x.pattern)
    .pop();
};
