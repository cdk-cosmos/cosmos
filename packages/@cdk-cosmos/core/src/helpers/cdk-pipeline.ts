import { Construct, RemovalPolicy } from '@aws-cdk/core';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { Pipeline, Artifact, StageOptions } from '@aws-cdk/aws-codepipeline';
import {
  CodeCommitSourceAction,
  CodeBuildAction,
  CodeCommitTrigger,
  ManualApprovalAction,
} from '@aws-cdk/aws-codepipeline-actions';
import {
  Project,
  BuildSpec,
  LinuxBuildImage,
  BuildEnvironmentVariable,
  Source,
  Artifacts,
  BuildEnvironmentVariableType,
  IProject,
} from '@aws-cdk/aws-codebuild';
import { IRole } from '@aws-cdk/aws-iam';
import { IVpc } from '@aws-cdk/aws-ec2';
import { PATTERN, SolarSystem, SolarSystemExtension } from '..';

export type BuildEnvironmentVariables = { [key: string]: BuildEnvironmentVariable };

export interface CdkPipelineProps {
  name?: string;
  cdkRepo: IRepository;
  cdkBranch?: string;
  deployRole?: IRole;
  deployVpc?: IVpc;
  deployEnvs?: BuildEnvironmentVariables;
  deployStacks?: string[];
}

export class CdkPipeline extends Construct {
  readonly Deploy: Project;
  readonly Pipeline: Pipeline;

  constructor(scope: Construct, id: string, props: CdkPipelineProps) {
    super(scope, id);

    const {
      name = id,
      cdkRepo,
      cdkBranch = 'master',
      deployRole = undefined,
      deployVpc = undefined,
      deployEnvs = undefined,
      deployStacks = [],
    } = props;

    const artifactBucket = new Bucket(this, 'CdkArtifactBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.Deploy = new Project(this, 'CdkDeploy', {
      projectName: `${name}Deploy`,
      role: deployRole,
      vpc: deployVpc,
      source: Source.codeCommit({
        repository: cdkRepo,
        branchOrRef: cdkBranch,
      }),
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '12',
            },
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          pre_build: {
            commands: ['npm ci'],
          },
          build: {
            commands: ['npx cdk synth ${STACKS}', 'npx cdk deploy --require-approval=never ${STACKS}'],
          },
        },
        artifacts: {
          'base-directory': 'cdk.out',
          files: ['*.template.json'],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_3_0,
        environmentVariables: {
          ...deployEnvs,
          STACKS: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: '',
          },
        },
      },
      artifacts: Artifacts.s3({
        bucket: artifactBucket,
        path: 'CodeBuild',
        includeBuildId: true,
        name: 'cdk.templates',
        packageZip: true,
      }),
    });

    const sourceOutput = new Artifact('CdkCodeOutput');
    const cdkDeployOutput = new Artifact('CdkDeployOutput');

    this.Pipeline = new Pipeline(this, 'CdkPipeline', {
      pipelineName: name,
      artifactBucket: artifactBucket,
      role: deployRole,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new CodeCommitSourceAction({
              actionName: 'CdkCheckout',
              repository: cdkRepo,
              branch: cdkBranch,
              output: sourceOutput,
              trigger: CodeCommitTrigger.NONE,
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new CodeBuildAction({
              actionName: 'CdkDeploy',
              project: this.Deploy,
              input: sourceOutput,
              outputs: [cdkDeployOutput],
              environmentVariables: {
                STACKS: {
                  type: BuildEnvironmentVariableType.PLAINTEXT,
                  value: deployStacks.join(''),
                },
              },
            }),
          ],
        },
      ],
    });
  }
}

export const addCdkDeployEnvStageToPipeline = (props: {
  pipeline: Pipeline;
  deployProject: IProject;
  deployEnvs?: BuildEnvironmentVariables;
  solarSystem: SolarSystem | SolarSystemExtension;
  isManualApprovalRequired?: boolean;
}): void => {
  const { pipeline, deployProject, deployEnvs = {}, solarSystem, isManualApprovalRequired = true } = props || {};

  let cdkSourceRepoAction = pipeline.stages[0].actions.find(x => x.actionProperties.actionName === 'CdkCheckout');
  if (!cdkSourceRepoAction) {
    const sourceOutput = new Artifact('CdkOutput');
    cdkSourceRepoAction = new CodeCommitSourceAction({
      actionName: 'CdkCheckout',
      repository: solarSystem.Galaxy.Cosmos.CdkRepo,
      output: sourceOutput,
      trigger: CodeCommitTrigger.NONE,
    });
    pipeline.stages[0].addAction(cdkSourceRepoAction);
  }

  const cdkOutputArtifact = (cdkSourceRepoAction?.actionProperties.outputs as Artifact[])[0];

  const deployStage: StageOptions = {
    stageName: solarSystem.RESOLVE('${Galaxy}-${SolarSystem}'), // TODO: is this confusing ?
    actions: [
      new CodeBuildAction({
        actionName: 'CdkDeploy',
        project: deployProject,
        input: cdkOutputArtifact,
        runOrder: 2,
        environmentVariables: {
          ...deployEnvs,
          STACKS: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: solarSystem.RESOLVE(PATTERN.SOLAR_SYSTEM, 'SolarSystem'),
          },
        },
      }),
    ],
  };

  if (isManualApprovalRequired) {
    deployStage.actions?.push(
      new ManualApprovalAction({
        actionName: 'CdkApproval',
        runOrder: 1,
      })
    );
  }

  pipeline.addStage(deployStage);
};
