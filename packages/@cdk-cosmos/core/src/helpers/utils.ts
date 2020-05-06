import { Stack, IConstruct } from '@aws-cdk/core';

export const isCrossAccount = (x: IConstruct, y: IConstruct, includeRegion?: boolean): boolean => {
  const stackX = Stack.of(x);
  const stackY = Stack.of(y);
  const diffAccount = stackX.account !== stackY.account;
  const diffRegion = stackX.region !== stackY.region;
  return includeRegion ? diffAccount && diffRegion : diffAccount;
};
