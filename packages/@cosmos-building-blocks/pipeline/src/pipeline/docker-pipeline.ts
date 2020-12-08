import { Construct } from '@aws-cdk/core';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { StandardPipeline, StandardPipelineProps } from './standard-pipeline';
import { ECR_LOGIN, DOCKER_EXPORT_APP_BUILD_VERSION, DOCKER_BUILD, DOCKER_PUSH } from '../commands';
import { BuildSpecBuilder } from '../build-spec';

export interface DockerPipelineProps<Repo> extends StandardPipelineProps<Repo> {}

export class DockerPipeline<Repo = IRepository> extends StandardPipeline<Repo> {
  constructor(scope: Construct, id: string, props: DockerPipelineProps<Repo>) {
    super(scope, id, {
      buildSpec: DockerPipeline.DefaultBuildSpec(),
      buildPrivileged: true,
      ...props,
    });
  }

  static DefaultBuildSpec(): BuildSpecBuilder {
    return new BuildSpecBuilder()
      .addCommands('pre_build', ECR_LOGIN, DOCKER_EXPORT_APP_BUILD_VERSION)
      .addCommands('build', DOCKER_BUILD)
      .addCommands('post_build', DOCKER_PUSH)
      .addExportedVariables('APP_BUILD_VERSION');
  }
}
