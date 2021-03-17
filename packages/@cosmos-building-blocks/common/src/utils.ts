import * as fs from 'fs';
import * as path from 'path';
import { Stack, IConstruct } from '@aws-cdk/core';

export const isCrossAccount = (x: IConstruct, y: IConstruct, includeRegion?: boolean): boolean => {
  const stackX = Stack.of(x);
  const stackY = Stack.of(y);
  const diffAccount = stackX.account !== stackY.account;
  const diffRegion = stackX.region !== stackY.region;
  return includeRegion ? diffAccount && diffRegion : diffAccount;
};

export const isCrossStack = (x: IConstruct, y: IConstruct): boolean => {
  return Stack.of(x) !== Stack.of(y);
};

export const getPackageVersion = (dirname: string) => {
  let filePath = path.join(dirname, 'package.json');
  while (!fs.existsSync(filePath)) {
    filePath = path.join(filePath, '../..', 'package.json');
    if (path.dirname(filePath) === '/' || path.dirname(filePath) === '\\') break;
  }
  const file = fs.readFileSync(filePath).toString();
  return JSON.parse(file).version as string;
};
