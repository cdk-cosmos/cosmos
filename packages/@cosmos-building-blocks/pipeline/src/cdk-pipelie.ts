/* eslint-disable @typescript-eslint/no-explicit-any */
import { Construct, Stack, IConstruct } from '@aws-cdk/core';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { Pipeline, Artifact, IAction, IStage } from '@aws-cdk/aws-codepipeline';
import {
  CodeCommitSourceAction,
  CodeBuildAction,
  CodeCommitTrigger,
  ManualApprovalAction,
  CodeBuildActionProps,
} from '@aws-cdk/aws-codepipeline-actions';
import {
  Project,
  LinuxBuildImage,
  BuildEnvironmentVariable,
  Source,
  Artifacts,
  BuildEnvironmentVariableType,
} from '@aws-cdk/aws-codebuild';
import { IRole } from '@aws-cdk/aws-iam';
import { IVpc, SubnetSelection, Peer, Port } from '@aws-cdk/aws-ec2';
import { SecureBucket } from '@cosmos-building-blocks/common';
import { NPM_LOGIN, NPM_INSTALL } from './commands';
import { BuildSpecBuilder } from './build-spec';

export type BuildEnvironmentVariables = { [key: string]: BuildEnvironmentVariable };

export interface CdkPipelineProps {
  pipelineName?: string;
  deployName?: string;
  cdkRepo: IRepository;
  cdkBranch?: string;
  deployRole?: IRole;
  deployVpc?: IVpc;
  deploySubnets?: SubnetSelection;
  deployEnvs?: BuildEnvironmentVariables;
  deployStacks?: Array<Stack | string>;
  deployDiffStage?: boolean;
}

export class CdkPipeline extends Construct {
  readonly stacks: Array<Stack | string>;
  readonly cdkRepo: IRepository;
  readonly deploy: Project;
  readonly pipeline: Pipeline;
  readonly hasDiffStage: boolean;

  constructor(scope: Construct, id: string, props: CdkPipelineProps) {
    super(scope, id);

    const {
      pipelineName,
      deployName,
      cdkRepo,
      cdkBranch = 'master',
      deployRole,
      deployVpc,
      deploySubnets,
      deployEnvs,
      deployStacks = findAllStacksFromCdkApp(scope),
      deployDiffStage = true,
    } = props;

    this.stacks = deployStacks;
    this.cdkRepo = cdkRepo;

    const artifactBucket = new SecureBucket(this, 'CdkArtifactBucket');

    const buildSpec = new BuildSpecBuilder()
      .addRuntime('nodejs', '12')
      .addCommands('pre_build', NPM_LOGIN, NPM_INSTALL)
      .addCommands(
        'build',
        'if [ $DIFF = true ]; then npx cdk diff ${STACKS}; fi;',
        'if [ $DEPLOY = true ]; then npx cdk deploy --require-approval=never ${STACKS}; fi;'
      )
      .addArtifacts({
        'base-directory': 'cdk.out',
        files: ['*.template.json'],
      });

    this.deploy = new Project(this, 'Deploy', {
      projectName: deployName,
      role: deployRole,
      vpc: deployVpc,
      subnetSelection: deploySubnets,
      source: Source.codeCommit({
        repository: cdkRepo,
        branchOrRef: cdkBranch,
      }),
      buildSpec: buildSpec,
      environment: {
        buildImage: LinuxBuildImage.STANDARD_3_0,
        environmentVariables: {
          NPM_KEY: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: '',
          },
          DIFF: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: 'true',
          },
          DEPLOY: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: 'true',
          },
          STACKS: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: stackNames(this.stacks).join(' '),
          },
          ...deployEnvs,
        },
        privileged: true,
      },
      artifacts: Artifacts.s3({
        bucket: artifactBucket,
        path: 'CodeBuild',
        includeBuildId: true,
        name: 'cdk.templates',
        packageZip: true,
      }),
    });

    const defaultSG = deployVpc ? this.deploy.connections.securityGroups[0] : undefined;
    if (defaultSG) defaultSG.addIngressRule(Peer.anyIpv4(), Port.allTraffic(), 'Allow all Inbound traffic by default');

    const sourceOutput = new Artifact('CdkCodeOutput');

    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: pipelineName,
      artifactBucket: artifactBucket,
      role: deployRole,
    });

    this.pipeline.addStage({
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
    });

    if (deployDiffStage) {
      this.pipeline.addStage({
        stageName: 'Diff',
        actions: [
          new CodeBuildAction({
            actionName: 'CdkDiff',
            project: this.deploy,
            input: sourceOutput,
            environmentVariables: {
              DIFF: {
                type: BuildEnvironmentVariableType.PLAINTEXT,
                value: 'true',
              },
              DEPLOY: {
                type: BuildEnvironmentVariableType.PLAINTEXT,
                value: 'false',
              },
            },
          }),
        ],
      });
      this.hasDiffStage = true;
    }

    (this.pipeline as any).prepare = this.preparePipeline.bind(this);
  }

  addDeployStackStage(props: {
    name: string;
    stacks: Array<Stack | string>;
    pipeline?: Pipeline;
    envs?: BuildEnvironmentVariables;
    isManualApprovalRequired?: boolean;
  }): void {
    const { name, stacks, pipeline = this.pipeline, envs = {}, isManualApprovalRequired = true } = props || {};

    let cdkOutputArtifact = findOutputFromCdkCheckout(pipeline.stages);
    if (!cdkOutputArtifact) {
      cdkOutputArtifact = new Artifact('CdkOutput');
      pipeline.stages[0].addAction(
        new CodeCommitSourceAction({
          actionName: 'CdkCheckout',
          repository: this.cdkRepo,
          output: cdkOutputArtifact,
          trigger: CodeCommitTrigger.NONE,
        })
      );
    }

    const deployStage = pipeline.addStage({ stageName: name });

    if (isManualApprovalRequired) {
      deployStage.addAction(
        new ManualApprovalAction({
          actionName: 'StackApproval',
        })
      );
    }

    deployStage.addAction(
      new CdkDeployAction({
        actionName: 'StackDeploy',
        project: this.deploy,
        input: cdkOutputArtifact,
        environmentVariables: envs,
        stacks: stacks,
        hasDiffStage: this.hasDiffStage,
      })
    );
  }

  preparePipeline(): void {
    const stackStages = findStacksFromCdkDeployActions(this.pipeline.stages);
    const remainingStacks = stackNames(this.stacks).filter(x => !stackNames(stackStages).includes(x));
    const depStacks = this.stacks
      .filter(Stack.isStack)
      .filter(x => stackNames(x.dependencies).some(x => stackNames(stackStages).includes(x)));
    const beforeStacks = remainingStacks.filter(x => !stackNames(depStacks).includes(x));
    const afterStacks = remainingStacks.filter(x => stackNames(depStacks).includes(x));

    const cdkOutputArtifact = findOutputFromCdkCheckout(this.pipeline.stages) as Artifact;

    if (beforeStacks.length) {
      this.pipeline.addStage({
        stageName: 'Deploy',
        placement: {
          justAfter: this.pipeline.stages[this.hasDiffStage ? 1 : 0],
        },
        actions: [
          new CdkDeployAction({
            actionName: 'CdkDeploy',
            project: this.deploy,
            input: cdkOutputArtifact,
            stacks: beforeStacks,
            hasDiffStage: this.hasDiffStage,
          }),
        ],
      });
    }

    if (afterStacks.length) {
      this.pipeline.addStage({
        stageName: 'DeployDependantStacks',
        actions: [
          new CdkDeployAction({
            actionName: 'DependantStackDeploy',
            project: this.deploy,
            input: cdkOutputArtifact,
            stacks: afterStacks,
            hasDiffStage: this.hasDiffStage,
          }),
        ],
      });
    }
  }
}

export class CdkDeployAction extends CodeBuildAction {
  // readonly actionProperties: ActionProperties & { environmentVariables?: BuildEnvironmentVariables };
  stacks: Array<Stack | string>;
  constructor(props: CodeBuildActionProps & { stacks?: Array<Stack | string>; hasDiffStage?: boolean }) {
    const { stacks = [], hasDiffStage, environmentVariables } = props;
    const envs: BuildEnvironmentVariables = {
      DIFF: {
        type: BuildEnvironmentVariableType.PLAINTEXT,
        value: hasDiffStage ? 'false' : 'true',
      },
      DEPLOY: {
        type: BuildEnvironmentVariableType.PLAINTEXT,
        value: 'true',
      },
    };

    if (stacks) {
      envs.STACKS = {
        type: BuildEnvironmentVariableType.PLAINTEXT,
        value: stackNames(stacks).join(' '),
      };
    }

    super({
      ...props,
      environmentVariables: {
        ...environmentVariables,
        ...envs,
      },
    });

    this.stacks = stacks;
  }

  static isCdkDeployAction(x: any): x is CdkDeployAction {
    return x instanceof CdkDeployAction;
  }
}

const findAllStacksFromCdkApp = (scope: IConstruct): Stack[] => {
  const stacks = scope.node.scopes[0].node
    .findAll()
    .filter<Stack>(Stack.isStack)
    .filter(x => !x.nested);
  return stacks;
};

const findOutputFromCdkCheckout = (stages: IStage[]): Artifact | undefined => {
  const action = stages
    .reduce<IAction[]>((res, item) => {
      res.push(...item.actions);
      return res;
    }, [])
    .find(x => x.actionProperties.actionName === 'CdkCheckout');
  if (!action) return undefined;
  if (!action.actionProperties.outputs || !action.actionProperties.outputs.length) return undefined;
  return action.actionProperties.outputs[0];
};

const findStacksFromCdkDeployActions = (stages: IStage[]): Array<Stack | string> =>
  stages
    .reduce<IAction[]>((res, item) => {
      res.push(...item.actions);
      return res;
    }, [])
    .filter(CdkDeployAction.isCdkDeployAction)
    .reduce<Array<Stack | string>>((res, item) => {
      if (item.stacks) res.push(...item.stacks);
      return res;
    }, []);

const stackNames = (stacks: Array<Stack | string>): string[] => {
  return stacks.map(x => (typeof x === 'string' ? x : x.stackName));
};
