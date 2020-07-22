export const AWS_ENV = 'AWS_ENV';

export const COSMOS_PARTITION = 'COSMOS_PARTITION';
export const COSMOS_VERSION = 'COSMOS_VERSION';
export const COSMOS_NETWORK_BUILDER = 'COSMOS_NETWORK_BUILDER';

export const PATTERN = {
  STACK: '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Version}?{Type}',
  COSMOS: '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Resource}*{Version}?',
  SINGLETON_COSMOS: '${Partition}{Galaxy}?{SolarSystem}?{Resource}+',
  RESOURCE: '{Resource}+{Version}?',
};
