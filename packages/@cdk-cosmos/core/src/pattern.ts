import { Construct } from '@aws-cdk/core';

type Dictionary = { [key: string]: string };
type Scope = {
  Name: string;
  Partition?: string;
  Cosmos?: Scope;
  Galaxy?: Scope;
};

export const PATTERN = {
  SINGLETON_COSMOS: '${Partition}-${Type}',
  SINGLETON_GALAXY: '${Partition}-${Galaxy}-${Type}',
  SINGLETON_SOLAR_SYSTEM: '${Partition}-${Galaxy}-${SolarSystem}-${Type}',
  COSMOS: '${Partition}-${Cosmos}-${Type}',
  GALAXY: '${Partition}-${Cosmos}-${Galaxy}-${Type}',
  SOLAR_SYSTEM: '${Partition}-${Cosmos}-${Galaxy}-${SolarSystem}-${Type}',
  SHORT_SOLAR_SYSTEM: '${Partition}-${Cosmos}-${SolarSystem}-${Type}',
};

const parseString: (template: string, params: Dictionary) => string = (template, params) => {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${template}\`;`)(...vals);
};

const parseScope = (scope: Scope | undefined, params: Dictionary): void => {
  while (scope) {
    if (scope.Galaxy) {
      params['SolarSystem'] = scope.Name;
      scope = scope.Galaxy;
    } else if (scope.Cosmos) {
      params['Galaxy'] = scope.Name;
      scope = scope.Cosmos;
    } else {
      params['Cosmos'] = scope.Name;
      if (!scope.Partition) throw new Error('Partition not found on Cosmos Bubble.');
      params['Partition'] = scope.Partition;
      scope = undefined;
    }
  }
};

export const RESOLVE: (pattern: string, type: string | Construct, scope: Scope, extraParams?: Dictionary) => string = (
  pattern,
  type,
  scope,
  extraParams = {}
) => {
  const params: Dictionary = { ...extraParams };
  params['Type'] = type instanceof Construct ? type.node.id : type;
  parseScope(scope, params);
  return parseString(pattern, params)
    .replace(/^-|-$/g, '')
    .trim();
};
