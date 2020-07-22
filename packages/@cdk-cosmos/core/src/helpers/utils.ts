/* eslint-disable @typescript-eslint/no-explicit-any */
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

export const getPackageVersion: () => string = () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../../package.json')).toString();
  return JSON.parse(file).version as string;
};

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export const mergeDeep = <T extends object>(
  target?: DeepPartial<T>,
  ...sources: Array<DeepPartial<T> | undefined>
): T => {
  if (!target) target = {};
  if (!sources.length) return target as T;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isSimpleObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key] as any, source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
};

export const defaultProps = mergeDeep;

const isObject = (item: any): item is object => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

const isSimpleObject = (item: any): boolean => isObject(item) && !item.constructor;
