import { Construct, RemovalPolicy } from '@aws-cdk/core';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { Pipeline, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeCommitSourceAction, CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';
import {
  Project,
  BuildSpec,
  LinuxBuildImage,
  BuildEnvironmentVariable,
  Source,
  BuildEnvironmentVariableType,
} from '@aws-cdk/aws-codebuild';
import { IRole } from '@aws-cdk/aws-iam';
import { NPM_RUN_BUILD, ECR_LOGIN, NPM_INSTALL, NPM_EXPORT_APP_BUILD_VERSION } from './commands';

export interface BuildEnvironmentVariables {
  [key: string]: BuildEnvironmentVariable;
}

export interface AppNodePipelineProps {
  name?: string;
  codeRepo: IRepository;
  codeBranch?: string;
  buildRole?: IRole;
  buildEnvs?: BuildEnvironmentVariables;
  buildSpec?: BuildSpec | { [key: string]: any };
}

export class AppNodePipeline extends Construct {
  readonly Build: Project;
  readonly Pipeline: Pipeline;

  constructor(scope: Construct, id: string, props: AppNodePipelineProps) {
    super(scope, id);

    const {
      name = id,
      codeRepo,
      codeBranch = 'master',
      buildRole = undefined,
      buildEnvs = undefined,
      buildSpec = AppNodePipeline.DefaultBuildSpec(),
    } = props;

    const artifactBucket = new Bucket(this, 'CodeArtifactBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN, // TODO:?
    });

    this.Build = new Project(this, 'Build', {
      projectName: `${name}Build`,
      role: buildRole,
      source: Source.codeCommit({
        repository: codeRepo,
        branchOrRef: codeBranch,
      }),
      buildSpec: buildSpec instanceof BuildSpec ? buildSpec : BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_3_0,
        environmentVariables: buildEnvs,
        privileged: true,
      },
    });

    const sourceOutput = new Artifact('CodeOutput');

    this.Pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: name,
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new CodeCommitSourceAction({
              actionName: 'CodeCheckout',
              repository: codeRepo,
              branch: codeBranch,
              output: sourceOutput,
              variablesNamespace: 'CodeCheckout',
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'CodeBuild',
              project: this.Build,
              input: sourceOutput,
              variablesNamespace: 'CodeBuild',
            }),
          ],
        },
      ],
    });
  }

  static DefaultBuildSpec() {
    return {
      version: '0.2',
      phases: {
        install: {
          'runtime-versions': {
            nodejs: '12',
          },
        },
        pre_build: {
          commands: [ECR_LOGIN, NPM_INSTALL, NPM_EXPORT_APP_BUILD_VERSION],
        },
        build: {
          commands: [NPM_RUN_BUILD],
        },
        post_build: {
          commands: [],
        },
      },
      env: {
        'exported-variables': ['APP_BUILD_VERSION'],
      },
    };
  }

  static DefaultAppBuildVersionStageEnv() {
    return {
      APP_BUILD_VERSION: {
        type: BuildEnvironmentVariableType.PLAINTEXT,
        value: '#{CodeBuild.APP_BUILD_VERSION}',
      },
    };
  }
}
