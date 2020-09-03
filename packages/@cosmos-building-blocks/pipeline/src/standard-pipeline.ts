import { Construct, Stack, PhysicalName } from '@aws-cdk/core';
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
import { IRole, Role, CompositePrincipal, ServicePrincipal } from '@aws-cdk/aws-iam';
import { IVpc, SubnetSelection } from '@aws-cdk/aws-ec2';
import { SecureBucket } from '@cosmos-building-blocks/common';
import { BuildSpecObject, BuildSpecBuilder } from './build-spec';

export interface StandardPipelineProps {
  pipelineName?: string;
  buildName?: string;
  codeRepo: IRepository;
  codeBranch?: string;
  buildRole?: IRole;
  buildVpc?: IVpc;
  buildSubnets?: SubnetSelection;
  buildEnvs?: BuildEnvironmentVariables;
  buildSpec?: BuildSpec | BuildSpecObject;
  buildImage?: IBuildImage;
  buildComputeType?: ComputeType;
  buildPrivileged?: boolean;
}

export class StandardPipeline extends Construct {
  readonly codeRepo: IRepository;
  readonly buildRole: IRole;
  readonly build: Project;
  readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string, props: StandardPipelineProps) {
    super(scope, id);

    const {
      pipelineName,
      buildName,
      codeRepo,
      codeBranch = 'master',
      buildRole,
      buildVpc,
      buildSubnets,
      buildEnvs,
      buildSpec,
      buildImage = LinuxBuildImage.STANDARD_3_0,
      buildComputeType = ComputeType.SMALL,
      buildPrivileged = false,
    } = props;

    // Cross Stack Dependency issue since repo stack might differ from this stack
    this.codeRepo =
      Stack.of(this) !== Stack.of(codeRepo)
        ? Repository.fromRepositoryName(this, codeRepo.node.id, codeRepo.repositoryName)
        : codeRepo;

    this.buildRole =
      buildRole ||
      new Role(this, 'Role', {
        roleName: PhysicalName.GENERATE_IF_NEEDED,
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('codepipeline.amazonaws.com'),
          new ServicePrincipal('codebuild.amazonaws.com')
        ),
      });

    const artifactBucket = new SecureBucket(this, 'CodeArtifactBucket');

    this.build = new Project(this, 'Build', {
      projectName: buildName,
      role: this.buildRole,
      vpc: buildVpc,
      subnetSelection: buildSubnets,
      source: Source.codeCommit({
        repository: this.codeRepo,
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
      role: this.buildRole,
    });

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new CodeCommitSourceAction({
          actionName: 'CodeCheckout',
          role: this.pipeline.role,
          repository: this.codeRepo,
          branch: codeBranch,
          output: sourceOutput,
          variablesNamespace: 'CodeCheckout',
        }),
      ],
    });

    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'CodeBuild',
          role: this.pipeline.role,
          project: this.build,
          input: sourceOutput,
          variablesNamespace: 'CodeBuild',
        }),
      ],
    });
  }

  static DefaultBuildSpec(): BuildSpecBuilder {
    return new BuildSpecBuilder().addCommands('build', 'make build').addExportedVariables('APP_BUILD_VERSION');
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
