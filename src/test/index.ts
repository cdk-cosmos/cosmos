/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import { Stack, App, NestedStack } from '@aws-cdk/core';

type SynthesizeStacks = (...stacks: Array<Stack | undefined>) => any[];
export const synthesizeStacks: SynthesizeStacks = (...stacks) => {
  const _stacks: Array<Stack | NestedStack> = stacks.filter(x => x) as any;
  const app = _stacks.reduce<App | null>((res, item) => {
    const app = item.node.root as App;
    if (app && !res) return app;
    if (app !== res) throw new Error('Stack must be in the same app.');
    return res;
  }, null);
  if (!app) throw new Error('App not found at root of stack.');
  const synth = app.synth();
  return _stacks.map(x => {
    if (x.nestedStackParent) {
      return JSON.parse(fs.readFileSync(path.join(synth.directory, x.templateFile)).toString('utf-8'));
    }
    return synth.getStackByName(x.stackName).template;
  });
};

export const toHaveResourceId = (stack: any, id: string): void => {
  expect(stack.Resources).toHaveProperty(id);
};

export const toHaveResourceCount = (stack: any, length: number): void => {
  expect(Object.keys(stack.Resources)).toHaveLength(length);
};
