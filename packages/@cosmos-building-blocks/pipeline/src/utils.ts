import { BuildEnvironmentVariable } from '@aws-cdk/aws-codebuild';

export type BuildEnvironmentVariables = Record<string, BuildEnvironmentVariable | string | undefined>;

export const parseEnvs = (
  envs: BuildEnvironmentVariables | undefined
): Record<string, BuildEnvironmentVariable> | undefined => {
  if (envs === undefined) return undefined;

  return Object.entries(envs).reduce<Record<string, BuildEnvironmentVariable>>((res, item) => {
    const [key, value] = item;
    if (value) {
      res[key] = typeof value === 'string' ? { value } : value;
    }
    return res;
  }, {});
};
