/* eslint-disable @typescript-eslint/camelcase */
import { Lazy, Stack } from '@aws-cdk/core';
import { BuildSpec } from '@aws-cdk/aws-codebuild';

// https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html#build-spec-ref-example

export type Phase = 'install' | 'pre_build' | 'build' | 'post_build';
export type Runtime = 'android' | 'dotnet' | 'golang' | 'nodejs' | 'java' | 'php' | 'python' | 'ruby';
export type Version = 'latest' | string;

export interface Command {
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
  'secondary-artifacts': object[];
}

export type BuildSpecObject = {
  version: '0.2';
  'run-as'?: string;
  env: {
    'exported-variables'?: string[];
    'git-credential-helper'?: boolean;
  };
  phases: Partial<Record<Phase, Command>> & {
    install?: {
      'runtime-versions'?: Partial<Record<Runtime, Version>>;
    };
  };
  proxy?: {
    'upload-artifacts'?: boolean;
    logs?: boolean;
  };
  reports?: Report[];
  artifacts?: Artifact[];
  cache?: {
    paths: string[];
  };
};

export class BuildSpecBuilder extends BuildSpec {
  readonly isImmediate: boolean;
  readonly spec: BuildSpecObject;

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

  addCommands(phase: Phase, ...commands: string[]): BuildSpecBuilder {
    if (!this.spec.phases[phase]) this.spec.phases[phase] = { commands: [] };
    const _phase = this.spec.phases[phase] as Command;
    _phase.commands.push(...commands);

    return this;
  }

  addFinallyCommands(phase: Phase, ...commands: string[]): BuildSpecBuilder {
    if (!this.spec.phases[phase]) this.spec.phases[phase] = { commands: [] };
    const _phase = this.spec.phases[phase] as Command;
    if (!_phase.finally) _phase.finally = [];
    _phase.finally.push(...commands);

    return this;
  }

  addExportedVariables(name: string): BuildSpecBuilder {
    if (!this.spec.env['exported-variables']) this.spec.env['exported-variables'] = [];
    this.spec.env['exported-variables'].push(name);

    return this;
  }
}
