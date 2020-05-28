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

export const COSMOS_PARTITION = 'COSMOS_PARTITION';
export const COSMOS_VERSION = 'COSMOS_VERSION';

export const COSMOS_NETWORK_BUILDER = 'COSMOS_NETWORK_BUILDER';
export const AWS_ENV = 'AWS_ENV';
