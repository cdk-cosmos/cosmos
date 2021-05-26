import { Construct, PhysicalName } from '@aws-cdk/core';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { Pipeline, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';
import {
  Project,
  BuildSpec,
  LinuxBuildImage,
  BuildEnvironmentVariableType,
  ComputeType,
  IBuildImage,
} from '@aws-cdk/aws-codebuild';
import { IRole, Role, CompositePrincipal, ServicePrincipal, PolicyStatement, PolicyDocument } from '@aws-cdk/aws-iam';
import { IVpc, SubnetSelection } from '@aws-cdk/aws-ec2';
import { SecureBucket } from '@cosmos-building-blocks/common';
import { BuildSpecObject, BuildSpecBuilder } from '../build-spec';
import { BuildEnvironmentVariables, parseEnvs } from '../utils';
import { SourceProvider, CodeCommitSourceProvider } from '../source';

export interface StandardPipelineProps {
  readonly pipelineName?: string;
  readonly buildName?: string;
  readonly codeSource?: SourceProvider;
  readonly codeRepo?: IRepository;
  readonly codeBranch?: string;
  readonly codeTrigger?: boolean;
  readonly buildRole?: IRole;
  readonly buildVpc?: IVpc;
  readonly buildSubnets?: SubnetSelection;
  readonly buildEnvs?: BuildEnvironmentVariables;
  readonly buildSpec?: BuildSpec | BuildSpecObject;
  readonly buildImage?: IBuildImage;
  readonly buildComputeType?: ComputeType;
  readonly buildPrivileged?: boolean;
}

export class StandardPipeline extends Construct {
  readonly codeSource: SourceProvider;
  readonly buildRole: IRole;
  readonly build: Project;
  readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string, props: StandardPipelineProps) {
    super(scope, id);

    const {
      pipelineName,
      buildName,
      codeSource,
      codeRepo,
      codeBranch,
      codeTrigger,
      buildRole,
      buildVpc,
      buildSubnets,
      buildEnvs,
      buildSpec,
      buildImage = LinuxBuildImage.STANDARD_5_0,
      buildComputeType = ComputeType.SMALL,
      buildPrivileged = false,
    } = props;

    const source = codeRepo
      ? ((new CodeCommitSourceProvider({
          repo: codeRepo,
          branch: codeBranch,
          trigger: codeTrigger,
        }) as any) as SourceProvider)
      : codeSource;
    if (!source) throw new Error('A source repository could not be found.');
    this.codeSource = source;
    this.codeSource.setup(this);

    this.buildRole =
      buildRole ||
      new Role(this, 'Role', {
        roleName: PhysicalName.GENERATE_IF_NEEDED,
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('codepipeline.amazonaws.com'),
          new ServicePrincipal('codebuild.amazonaws.com')
        ),
        inlinePolicies: {
          // https://docs.aws.amazon.com/codebuild/latest/userguide/session-manager.html
          sessionManager: new PolicyDocument({
            statements: [
              new PolicyStatement({
                resources: ['*'],
                actions: [
                  'ssmmessages:CreateControlChannel',
                  'ssmmessages:CreateDataChannel',
                  'ssmmessages:OpenControlChannel',
                  'ssmmessages:OpenDataChannel',
                ],
              }),
            ],
          }),
        },
      });

    const artifactBucket = new SecureBucket(this, 'CodeArtifactBucket');

    this.build = new Project(this, 'Build', {
      projectName: buildName,
      role: this.buildRole,
      vpc: buildVpc,
      subnetSelection: buildSubnets,
      source: this.codeSource.source(),
      buildSpec: buildSpec instanceof BuildSpec ? buildSpec : buildSpec ? BuildSpec.fromObject(buildSpec) : undefined,
      environment: {
        computeType: buildComputeType,
        buildImage: buildImage,
        environmentVariables: parseEnvs(buildEnvs),
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
        this.codeSource.sourceAction('CodeCheckout', this.pipeline.role, sourceOutput, codeBranch, codeTrigger),
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
