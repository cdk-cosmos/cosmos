import { Construct, RemovalPolicy, Stack } from '@aws-cdk/core';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Pipeline, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeCommitSourceAction, CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';
import {
  Project,
  BuildSpec,
  LinuxBuildImage,
  BuildEnvironmentVariable,
  Source,
  BuildEnvironmentVariableType,
  ComputeType,
  IBuildImage,
} from '@aws-cdk/aws-codebuild';
import { IRole } from '@aws-cdk/aws-iam';
import { IVpc } from '@aws-cdk/aws-ec2';
import { BuildSpecObject } from './build-spec';

export interface BasePipelineProps {
  pipelineName?: string;
  buildName?: string;
  codeRepo: IRepository;
  codeBranch?: string;
  buildRole?: IRole;
  buildVpc?: IVpc;
  buildEnvs?: BuildEnvironmentVariables;
  buildSpec?: BuildSpec | BuildSpecObject;
  buildImage?: IBuildImage;
  buildComputeType?: ComputeType;
  buildPrivileged?: boolean;
}

export class BasePipeline extends Construct {
  readonly build: Project;
  readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string, props: BasePipelineProps) {
    super(scope, id);

    const {
      pipelineName,
      buildName,
      codeRepo,
      codeBranch = 'master',
      buildRole,
      buildVpc,
      buildEnvs,
      buildSpec,
      buildImage = LinuxBuildImage.STANDARD_3_0,
      buildComputeType = ComputeType.SMALL,
      buildPrivileged = false,
    } = props;

    const artifactBucket = new Bucket(this, 'CodeArtifactBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.build = new Project(this, 'Build', {
      projectName: buildName,
      role: buildRole,
      vpc: buildVpc,
      source: Source.codeCommit({
        repository:
          Stack.of(this) !== Stack.of(codeRepo)
            ? Repository.fromRepositoryName(this, codeRepo.node.id, codeRepo.repositoryName)
            : codeRepo,
        branchOrRef: codeBranch,
      }),
      buildSpec: buildSpec instanceof BuildSpec ? buildSpec : buildSpec ? BuildSpec.fromObject(buildSpec) : undefined,
      environment: {
        computeType: buildComputeType,
        buildImage: buildImage,
        environmentVariables: buildEnvs,
        privileged: buildPrivileged,
      },
    });

    const sourceOutput = new Artifact('CodeOutput');

    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: pipelineName,
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
              project: this.build,
              input: sourceOutput,
              variablesNamespace: 'CodeBuild',
            }),
          ],
        },
      ],
    });
  }

  static DefaultAppBuildVersionStageEnv(): BuildEnvironmentVariables {
    return {
      APP_BUILD_VERSION: {
        type: BuildEnvironmentVariableType.PLAINTEXT,
        value: '#{CodeBuild.APP_BUILD_VERSION}',
      },
    };
  }
}

export type BuildEnvironmentVariables = {
  [key: string]: BuildEnvironmentVariable;
};
