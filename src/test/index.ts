import { Stack, App } from '@aws-cdk/core';
import { CloudFormationStackArtifact } from '@aws-cdk/cx-api';

type SynthesizeStacks = (...stacks: Stack[]) => CloudFormationStackArtifact[];
export const synthesizeStacks: SynthesizeStacks = (...stacks) => {
  const app = stacks
    .map(x => x && x.node.root)
    .reduce<App | null>((res, item) => {
      if (!(item instanceof App)) return res;
      if (res === null) return item;
      if (item !== res) throw new Error('Stack must be in the same app.');
      return res;
    }, null);
  if (!app) throw new Error('App not found at root of stack.');
  const synth = app.synth();
  return stacks.map(x => x && synth.getStackArtifact(x.artifactId));
};

export const toHaveResourceId = (stack: CloudFormationStackArtifact, id: string): void => {
  expect(stack.template.Resources).toHaveProperty(id);
};

export const toHaveResourceCount = (stack: CloudFormationStackArtifact, length: number): void => {
  expect(Object.keys(stack.template.Resources)).toHaveLength(length);
};
