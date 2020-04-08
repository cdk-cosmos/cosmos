import { Construct } from '@aws-cdk/core/lib/construct';

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
  DOCKER_TAG: '${Cosmos}/${Type}',
  LOG_GROUP: '${Partition}/${Cosmos}/${SolarSystem}/${Type}',
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

export interface ResolveParams {
  Scope?: Scope;
  Type?: string | Construct;
}

export const _RESOLVE: (pattern: string, params: ResolveParams) => string = (pattern, params) => {
  const { Scope, Type, ...extraParams } = params;
  const _params: Dictionary = { ...extraParams };

  parseScope(Scope, _params);

  if (Type !== undefined) {
    _params['Type'] = Type instanceof Construct ? Type.node.id : Type;
  }

  return parseString(pattern, _params)
    .replace(/^-|-$/g, '')
    .trim();
};

export const RESOLVE: (
  pattern: string,
  type?: string | Construct,
  scope?: Scope,
  extraParams?: Dictionary
) => string = (pattern, type, scope, extraParams = {}) => {
  return _RESOLVE(pattern, {
    ...extraParams,
    Scope: scope,
    Type: type,
  });
};

declare module '@aws-cdk/core/lib/construct' {
  interface Construct {
    RESOLVE: (pattern: string, type?: string | Construct, extraParams?: Dictionary) => string;
  }
}

Construct.prototype.RESOLVE = function(pattern, type, extraParams): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return RESOLVE(pattern, type, this as any, extraParams);
};
