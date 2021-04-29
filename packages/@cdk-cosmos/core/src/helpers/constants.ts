export const CONTEXT_AWS_ENV = 'AWS_ENV';
export const CONTEXT_COSMOS_PARTITION = 'COSMOS_PARTITION';
export const CONTEXT_COSMOS_VERSION = 'COSMOS_VERSION';
export const CONTEXT_COSMOS_NETWORK_BUILDER = 'COSMOS_NETWORK_BUILDER';
export const CONTEXT_COSMOS_NAMING = 'COSMOS_NAMING';

export const PATTERN = {
  STACK: '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Feature}?{Version}?{Type}',
  COSMOS: '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Feature}?{Resource}*{Version}?',
  SINGLETON_COSMOS: '${Partition}{Galaxy}?{SolarSystem}?{Feature}?{Resource}+',
  RESOURCE: '{Resource}+{Version}?',
};
