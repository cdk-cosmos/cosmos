import { Construct } from '@aws-cdk/core';
import { BuildEnvironmentVariableType } from '@aws-cdk/aws-codebuild';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { StandardPipeline, StandardPipelineProps } from './standard-pipeline';
import { NPM_BUILD, NPM_INSTALL, NPM_EXPORT_APP_BUILD_VERSION, NPM_LOGIN } from '../commands';
import { BuildSpecBuilder } from '../build-spec';

export interface NodePipelineProps<Repo> extends StandardPipelineProps<Repo> {}

export class NodePipeline<Repo = IRepository> extends StandardPipeline<Repo> {
  constructor(scope: Construct, id: string, props: NodePipelineProps<Repo>) {
    super(scope, id, {
      buildSpec: NodePipeline.DefaultBuildSpec(),
      buildEnvs: {
        NPM_KEY: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: '',
        },
      },
      ...props,
    });
  }

  static DefaultBuildSpec(): BuildSpecBuilder {
    return new BuildSpecBuilder()
      .addRuntime('nodejs', '12')
      .addCommands('pre_build', NPM_LOGIN, NPM_INSTALL, NPM_EXPORT_APP_BUILD_VERSION)
      .addCommands('build', NPM_BUILD)
      .addExportedVariables('APP_BUILD_VERSION');
  }
}
