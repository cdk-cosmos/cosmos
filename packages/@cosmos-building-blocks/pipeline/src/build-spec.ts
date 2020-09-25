/* eslint-disable @typescript-eslint/camelcase */
import { Lazy, Stack } from '@aws-cdk/core';
import { BuildSpec } from '@aws-cdk/aws-codebuild';

// https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html#build-spec-ref-example

export type EnvironmentVariables = 'variables' | 'parameter-store' | 'secrets-manager';

export type Phase = 'install' | 'pre_build' | 'build' | 'post_build';
export type Runtime = 'android' | 'dotnet' | 'golang' | 'nodejs' | 'java' | 'php' | 'python' | 'ruby';
export type Version = 'latest' | string;

export type NullableString = string | null | undefined;

export interface Commands {
  'run-as'?: string;
  commands: string[];
  finally?: string[];
}

export interface Report {
  files: string[];
  'base-directory'?: string;
  'discard-paths'?: boolean;
  'file-format'?: 'JunitXml' | 'NunitXml' | 'CucumberJson' | 'VisualStudioTrx' | 'TestNGXml';
}

export interface Artifact {
  files: string[];
  name?: string;
  'discard-paths'?: string;
  'base-directory'?: string;
}

export type BuildSpecObject = {
  version: '0.2';
  'run-as'?: string;
  env: {
    shell?: string;
    variables?: Record<string, string>;
    'parameter-store'?: Record<string, string>;
    'secrets-manager'?: Record<string, string>;
    'exported-variables'?: string[];
    'git-credential-helper'?: boolean;
  };
  phases: Partial<Record<Phase, Commands>> & {
    install?: {
      'runtime-versions'?: Partial<Record<Runtime, Version>>;
    };
  };
  proxy?: {
    'upload-artifacts'?: boolean;
    logs?: boolean;
  };
  reports?: Report[];
  artifacts?: Artifact & { 'secondary-artifacts'?: Artifact[] };
  cache?: {
    paths: string[];
  };
};

export class BuildSpecBuilder extends BuildSpec {
  readonly isImmediate: boolean;
  spec: BuildSpecObject;

  constructor() {
    super();
    this.isImmediate = true;
    this.spec = {
      version: '0.2',
      phases: {},
      env: {},
    };
  }

  toBuildSpec(): string {
    return Lazy.stringValue({ produce: ctx => Stack.of(ctx.scope).toJsonString(this.spec, 2) });
  }

  addRuntime(runtime: Runtime, version: Version): BuildSpecBuilder {
    if (!this.spec.phases.install) this.spec.phases.install = { commands: [] };
    const install = this.spec.phases.install;
    if (!install['runtime-versions']) install['runtime-versions'] = {};
    install['runtime-versions'][runtime] = version;

    return this;
  }

  addCommands(phase: Phase, ...commands: NullableString[]): BuildSpecBuilder {
    if (!this.spec.phases[phase]) this.spec.phases[phase] = { commands: [] };
    const _phase = this.spec.phases[phase] as Commands;
    _phase.commands.push(...filterNullableStrings(commands));

    return this;
  }

  addFinallyCommands(phase: Phase, ...commands: NullableString[]): BuildSpecBuilder {
    if (!this.spec.phases[phase]) this.spec.phases[phase] = { commands: [] };
    const _phase = this.spec.phases[phase] as Commands;
    if (!_phase.finally) _phase.finally = [];
    _phase.finally.push(...filterNullableStrings(commands));

    return this;
  }

  addEnvironmentVariables(type: EnvironmentVariables, env: Record<string, string>): BuildSpecBuilder {
    if (!this.spec.env[type]) this.spec.env[type] = {};
    Object.assign(this.spec.env[type], env);

    return this;
  }

  addExportedVariables(...name: NullableString[]): BuildSpecBuilder {
    if (!this.spec.env['exported-variables']) this.spec.env['exported-variables'] = [];
    this.spec.env['exported-variables'].push(...filterNullableStrings(name));

    return this;
  }

  setArtifact(artifact: Artifact): BuildSpecBuilder {
    this.spec.artifacts = artifact;

    return this;
  }

  addSecondaryArtifacts(...artifact: Artifact[]): BuildSpecBuilder {
    if (!this.spec.artifacts) throw new Error('An Artifact must be set first.');
    if (!this.spec.artifacts['secondary-artifacts']) this.spec.artifacts['secondary-artifacts'] = [];
    this.spec.artifacts['secondary-artifacts'].push(...artifact);

    return this;
  }

  addReports(...report: Report[]): BuildSpecBuilder {
    if (!this.spec.reports) this.spec.reports = [];
    this.spec.reports.push(...report);

    return this;
  }

  addCachePaths(...path: string[]): BuildSpecBuilder {
    if (!this.spec.cache) this.spec.cache = { paths: [] };
    this.spec.cache.paths.push(...path);

    return this;
  }

  edit(fn: (spec: BuildSpecObject) => BuildSpecObject | undefined): BuildSpecBuilder {
    this.spec = fn(this.spec) || this.spec;

    return this;
  }
}

const filterNullableStrings = (commands: NullableString[]): string[] => commands.filter(x => x) as string[];
