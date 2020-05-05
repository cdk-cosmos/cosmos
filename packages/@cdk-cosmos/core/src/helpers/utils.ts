import { Stack, IConstruct } from '@aws-cdk/core';
// import {
//   Bubble,
//   Cosmos,
//   Galaxy,
//   SolarSystem,
//   CosmosExtension,
//   GalaxyExtension,
//   SolarSystemExtension,
// } from '../interfaces';

// export function getParent(scope: Cosmos): undefined;
// export function getParent(scope: Galaxy): Cosmos;
// export function getParent(scope: SolarSystem): Galaxy;
// export function getParent(scope: CosmosExtension): undefined;
// export function getParent(scope: GalaxyExtension): CosmosExtension;
// export function getParent(scope: SolarSystemExtension): GalaxyExtension;
// export function getParent(
//   scope: Cosmos | Galaxy | SolarSystem | CosmosExtension | GalaxyExtension | SolarSystemExtension
// ): Galaxy | Cosmos | GalaxyExtension | CosmosExtension | undefined {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const _scope: any = scope;

//   if (_scope.Galaxy) {
//     return _scope.Galaxy;
//   } else if (_scope.Cosmos) {
//     return _scope.Cosmos;
//   } else {
//     return undefined;
//   }
// }

// export function getCosmos(scope: Cosmos | Galaxy | SolarSystem): Cosmos;
// export function getCosmos(scope: CosmosExtension | GalaxyExtension | SolarSystemExtension): CosmosExtension;
// export function getCosmos(
//   scope: Cosmos | Galaxy | SolarSystem | CosmosExtension | GalaxyExtension | SolarSystemExtension
// ): Cosmos | CosmosExtension {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   let _scope: any = scope;
//   if (_scope.Galaxy) _scope = _scope.Galaxy;
//   if (_scope.Cosmos) _scope = _scope.Cosmos;
//   return _scope;
// }

// export function getGalaxy(scope: Galaxy | SolarSystem): Galaxy;
// export function getGalaxy(scope: GalaxyExtension | SolarSystemExtension): GalaxyExtension;
// export function getGalaxy(
//   scope: Galaxy | SolarSystem | GalaxyExtension | SolarSystemExtension
// ): Galaxy | GalaxyExtension {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   let _scope: any = scope;
//   if (_scope.Galaxy) _scope = _scope.Galaxy;
//   return _scope;
// }

export const isCrossAccount = (x: IConstruct, y: IConstruct, includeRegion?: boolean): boolean => {
  const stackX = Stack.of(x);
  const stackY = Stack.of(y);
  const diffAccount = stackX.account !== stackY.account;
  const diffRegion = stackX.region !== stackY.region;
  return includeRegion ? diffAccount && diffRegion : diffAccount;
};
