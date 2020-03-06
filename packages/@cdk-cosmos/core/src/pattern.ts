type Dictionary = { [key: string]: string };
type Cosmos = { Type: 'Cosmos'; Name: string };
type Galaxy = { Type: 'Galaxy'; Name: string; Cosmos: Cosmos };
type SolarSystem = { Type: 'SolarSystem'; Name: string; Galaxy: Galaxy };
type CosmosExtension = { Type: 'CosmosExtension'; Name: string };
type GalaxyExtension = { Type: 'GalaxyExtension'; Name: string; Cosmos: Cosmos };
type SolarSystemExtension = { Type: 'SolarSystemExtension'; Name: string; Galaxy: Galaxy };
type Scopes = Cosmos | Galaxy | SolarSystem | CosmosExtension | GalaxyExtension | SolarSystemExtension;

const parseString: (template: string, params: Dictionary) => string = (template, params) => {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${template}\`;`)(...vals);
};

export const PATTERN = {
  COSMOS: '${Partition}-${Cosmos}-${Type}',
  GALAXY: '${Partition}-${Cosmos}-${Galaxy}-${Type}',
  SOLAR_SYSTEM: '${Partition}-${Cosmos}-${Galaxy}-${SolarSystem}-${Type}',
  SHORT: {
    SOLAR_SYSTEM: '${Partition}-${Cosmos}-${SolarSystem}-${Type}',
  },
};

export const RESOLVE: (pattern: string, scope: Scopes, type?: string) => string = (pattern, scope, type) => {
  const params: Dictionary = {};

  switch (scope.Type) {
    case 'SolarSystem':
      params['Partition'] = 'Core';
      params['SolarSystem'] = scope.Name;
      params['Galaxy'] = scope.Galaxy.Name;
      params['Cosmos'] = scope.Galaxy.Cosmos.Name;
      break;
    case 'Galaxy':
      params['Partition'] = 'Core';
      params['Galaxy'] = scope.Name;
      params['Cosmos'] = scope.Cosmos.Name;
      break;
    case 'Cosmos':
      params['Partition'] = 'Core';
      params['Cosmos'] = scope.Name;
      break;
    case 'SolarSystemExtension':
      params['Partition'] = 'App';
      params['SolarSystem'] = scope.Name;
      params['Galaxy'] = scope.Galaxy.Name;
      params['Cosmos'] = scope.Galaxy.Cosmos.Name;
      break;
    case 'GalaxyExtension':
      params['Partition'] = 'App';
      params['Galaxy'] = scope.Name;
      params['Cosmos'] = scope.Cosmos.Name;
      break;
    case 'CosmosExtension':
      params['Partition'] = 'App';
      params['Cosmos'] = scope.Name;
  }

  params['Type'] = type || '';

  return parseString(pattern, params)
    .replace(/^-|-$/g, '')
    .trim();
};
