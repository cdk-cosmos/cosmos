import { Construct } from '@aws-cdk/core';
import { BuildEnvironmentVariableType } from '@aws-cdk/aws-codebuild';
import { NPM_BUILD, NPM_INSTALL, NPM_EXPORT_APP_BUILD_VERSION, NPM_LOGIN } from './commands';
import { StandardPipeline, StandardPipelineProps } from './standard-pipeline';
import { BuildSpecBuilder } from './build-spec';

export interface NodePipelineProps extends StandardPipelineProps {}

export class NodePipeline extends StandardPipeline {
  constructor(scope: Construct, id: string, props: NodePipelineProps) {
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
