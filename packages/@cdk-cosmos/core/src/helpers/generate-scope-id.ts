import { IConstruct } from '@aws-cdk/core';
import { PATTERN, CONTEXT_COSMOS_PARTITION, CONTEXT_COSMOS_VERSION } from './constants';
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
  partition?: string;
  version?: string;
  delimiter?: string;
}): string {
  const { scope, id, type, partition, version, delimiter } = props;
  return generateNodeId({ scope, pattern: PATTERN.SINGLETON_COSMOS, id, type, partition, version, delimiter });
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
    scopes: id ? [{ id: id, type }] : [],
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
  const partition = props.partition || scope.node.tryGetContext(CONTEXT_COSMOS_PARTITION);
  if (partition) context.push({ key: 'Partition', value: partition });
  const version = props.version || scope.node.tryGetContext(CONTEXT_COSMOS_VERSION);
  if (version) context.push({ key: 'Version', value: version });

  const pattern = props.pattern || getPattern(scopes) || defaultPattern;
  if (!pattern) throw new Error('No Pattern was found. Provide one');

  return nodeId({ context, pattern, delimiter });
};

const getScopes = (scope: IConstruct): IScope[] =>
  scope.node.scopes.map((x) => x.node).map((x) => ({ id: x.id, type: x.type || 'Resource', pattern: x.pattern }));

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
    .filter((x) => x.pattern)
    .map((x) => x.pattern)
    .pop();
};
