/* eslint-disable @typescript-eslint/no-explicit-any */
import { Construct, Stack, IConstruct, Lazy, IResolvable, PhysicalName } from '@aws-cdk/core';
import { IRepository } from '@aws-cdk/aws-codecommit';
import { Pipeline, Artifact, IAction, IStage } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, ManualApprovalAction, CodeBuildActionProps } from '@aws-cdk/aws-codepipeline-actions';
import {
  Project,
  LinuxBuildImage,
  BuildEnvironmentVariable,
  Artifacts,
  BuildEnvironmentVariableType,
  ComputeType,
} from '@aws-cdk/aws-codebuild';
import { IRole, Role, CompositePrincipal, ServicePrincipal } from '@aws-cdk/aws-iam';
import { IVpc, SubnetSelection, Peer, Port } from '@aws-cdk/aws-ec2';
import { SecureBucket } from '@cosmos-building-blocks/common';
import { NPM_LOGIN, NPM_INSTALL } from '../commands';
import { BuildSpecBuilder } from '../build-spec';
import { BuildEnvironmentVariables, parseEnvs } from '../utils';
import { SourceProvider, CodeCommitSourceProvider } from '../source';

export interface CdkPipelineProps<Repo> {
  readonly pipelineName?: string;
  readonly deployName?: string;
  readonly cdkSource?: SourceProvider<Repo>;
  readonly cdkRepo?: IRepository;
  readonly cdkBranch?: string;
  readonly cdkTrigger?: boolean;
  readonly cdkWorkingDir?: string;
  readonly deployRole?: IRole;
  readonly deployVpc?: IVpc;
  readonly deploySubnets?: SubnetSelection;
  readonly deployEnvs?: BuildEnvironmentVariables;
  readonly deployStacks?: Array<Stack | string>;
  readonly deployDiffStage?: boolean;
  readonly npmKey?: string | BuildEnvironmentVariable;
}

export interface AddDeployStackStageProps {
  name: string;
  stacks: Array<Stack | string>;
  pipeline?: Pipeline;
  envs?: BuildEnvironmentVariables;
  exclusive?: boolean;
  isManualApprovalRequired?: boolean;
}

export class CdkPipeline<Repo = IRepository> extends Construct {
  readonly stacks: IResolvable;
  readonly cdkSource: SourceProvider<Repo>;
  readonly deployRole: IRole;
  readonly deploy: Project;
  readonly pipeline: Pipeline;
  readonly hasDiffStage: boolean;

  constructor(scope: Construct, id: string, props: CdkPipelineProps<Repo>) {
    super(scope, id);

    const {
      pipelineName,
      deployName,
      cdkSource,
      cdkRepo,
      cdkBranch,
      cdkTrigger,
      cdkWorkingDir,
      deployRole,
      deployVpc,
      deploySubnets,
      deployEnvs,
      deployStacks,
      deployDiffStage = true,
      npmKey,
    } = props;

    if (deployStacks && deployStacks.length === 0) {
      throw new Error('DeployStacks must be >= 1');
    }

    this.stacks = Lazy.anyValue({
      produce: () => stackNames(deployStacks || findAllStacksFromCdkApp(scope)),
    });

    const source = cdkRepo
      ? ((new CodeCommitSourceProvider({
          repo: cdkRepo,
          branch: cdkBranch || 'master',
          trigger: cdkTrigger || false,
        }) as any) as SourceProvider<Repo>)
      : cdkSource;
    if (!source) throw new Error('A source repository could not be found.');
    this.cdkSource = source;
    this.cdkSource.setup(this);

    this.deployRole =
      deployRole ||
      new Role(this, 'Role', {
        roleName: PhysicalName.GENERATE_IF_NEEDED,
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('codepipeline.amazonaws.com'),
          new ServicePrincipal('codebuild.amazonaws.com')
        ),
      });

    const artifactBucket = new SecureBucket(this, 'CdkArtifactBucket');

    const changeDir = cdkWorkingDir ? `cd ${cdkWorkingDir}` : null;

    const buildSpec = new BuildSpecBuilder()
      .addRuntime('nodejs', '12')
      .addCommands('pre_build', changeDir, npmKey ? NPM_LOGIN : null, NPM_INSTALL)
      .addCommands(
        'build',
        changeDir,
        'if [ $DIFF = true ]; then npx cdk diff ${STACKS}; fi;',
        'if [ $DEPLOY = true ]; then npx cdk deploy --require-approval=never ${STACKS}; fi;'
      )
      .setArtifact({
        'base-directory': 'cdk.out',
        files: ['*.template.json'],
      });

    const envs: BuildEnvironmentVariables = {
      NPM_KEY:
        typeof npmKey === 'string'
          ? {
              type: BuildEnvironmentVariableType.PLAINTEXT,
              value: npmKey,
            }
          : npmKey,
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
        value: Lazy.stringValue({
          produce: context => this.stacks.resolve(context).join(' '),
        }),
      },
      ...deployEnvs,
    };

    this.deploy = new Project(this, 'Deploy', {
      projectName: deployName,
      role: this.deployRole,
      vpc: deployVpc,
      subnetSelection: deploySubnets,
      source: this.cdkSource.source(),
      buildSpec: buildSpec,
      environment: {
        computeType: ComputeType.SMALL,
        buildImage: LinuxBuildImage.STANDARD_4_0,
        environmentVariables: parseEnvs(envs),
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
      role: this.deployRole,
    });

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [this.cdkSource.sourceAction('CdkCheckout', this.pipeline.role, sourceOutput)],
    });

    if (deployDiffStage) {
      this.pipeline.addStage({
        stageName: 'Diff',
        actions: [
          new CodeBuildAction({
            actionName: 'CdkDiff',
            role: this.pipeline.role,
            runOrder: 1,
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
          new ManualApprovalAction({
            actionName: 'CdkDiffApproval',
            role: this.pipeline.role,
            runOrder: 2,
            additionalInformation: 'Please review the CdkDiff build.',
          }),
        ],
      });
      this.hasDiffStage = true;
    }

    (this.pipeline as any).prepare = this.preparePipeline.bind(this);
  }

  addDeployStackStage(props: AddDeployStackStageProps): void {
    const { name, stacks, pipeline = this.pipeline, envs = {}, isManualApprovalRequired = true, exclusive = false } =
      props || {};

    if (stacks && stacks.length === 0) {
      throw new Error('Stacks must be >= 1');
    }

    let cdkOutputArtifact = findOutputFromCdkCheckout(pipeline.stages);
    if (!cdkOutputArtifact) {
      cdkOutputArtifact = new Artifact('CdkOutput');
      pipeline.stages[0].addAction(
        this.cdkSource.sourceAction('CdkCheckout', this.pipeline.role, cdkOutputArtifact, undefined, false)
      );
    }

    const deployStage = pipeline.addStage({ stageName: name });

    if (isManualApprovalRequired) {
      deployStage.addAction(
        new ManualApprovalAction({
          actionName: 'StackApproval',
          role: pipeline.role,
          runOrder: 1,
        })
      );
    }

    deployStage.addAction(
      new CdkDeployAction({
        actionName: 'StackDeploy',
        role: pipeline.role,
        runOrder: 2,
        project: this.deploy,
        input: cdkOutputArtifact,
        environmentVariables: parseEnvs(envs),
        stacks: stackNames(stacks),
        hasDiffStage: pipeline === this.pipeline && this.hasDiffStage,
        exclusive: exclusive,
      })
    );
  }

  preparePipeline(): void {
    const stacks = Stack.of(this).resolve(this.stacks) as string[];
    const stackStages = findStacksFromCdkDeployActions(this.pipeline);
    const remainingStacks = stacks.filter(x => !stackStages.includes(x));
    const cdkOutputArtifact = findOutputFromCdkCheckout(this.pipeline.stages) as Artifact;

    if (remainingStacks.length) {
      this.pipeline.addStage({
        stageName: 'Deploy',
        actions: [
          new CdkDeployAction({
            actionName: 'CdkDeploy',
            role: this.pipeline.role,
            project: this.deploy,
            input: cdkOutputArtifact,
            stacks: remainingStacks,
            hasDiffStage: this.hasDiffStage,
            exclusive: true,
          }),
        ],
      });
    }
  }
}

export interface CdkDeployActionProps extends CodeBuildActionProps {
  stacks?: string[];
  hasDiffStage?: boolean;
  exclusive?: boolean;
}
export class CdkDeployAction extends CodeBuildAction {
  _props: CdkDeployActionProps;

  constructor(props: CdkDeployActionProps) {
    const { stacks = [], hasDiffStage, environmentVariables, exclusive } = props;

    const envs: BuildEnvironmentVariables = {
      ...environmentVariables,
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
        value: (exclusive ? '-e ' : '') + stacks.join(' '),
      };
    }

    super({
      ...props,
      environmentVariables: parseEnvs(envs),
    });

    this._props = props;
  }

  static isCdkDeployAction(x: any): x is CdkDeployAction {
    return x instanceof CdkDeployAction;
  }
}

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

const findStacksFromCdkDeployActions = (pipeline: Pipeline): string[] =>
  pipeline.stages
    .reduce<IAction[]>((res, item) => {
      res.push(...item.actions);
      return res;
    }, [])
    .filter(CdkDeployAction.isCdkDeployAction)
    .reduce<string[]>((res, item) => {
      const stacks = item._props.stacks;
      if (stacks) {
        res.push(...stacks);
        if (!item._props.exclusive) {
          const allStacks = findAllStacksFromCdkApp(pipeline);
          const deps = stacks
            .map(x => allStacks.find(y => x === y.stackName) as Stack)
            .filter(x => x)
            .map(x => findStackDependencies(x))
            .flat()
            .map(x => x.stackName);
          for (const stack of deps) {
            if (!res.includes(stack)) res.push(stack);
          }
        }
      }
      return res;
    }, []);

const findAllStacksFromCdkApp = (scope: IConstruct): Stack[] => {
  const stacks = scope.node.scopes[0].node
    .findAll()
    .filter<Stack>(Stack.isStack)
    .filter(x => !x.nested);
  return stacks;
};

const findStackDependencies = (stack: Stack): Stack[] => {
  const deps = [
    ...stack.dependencies,
    ...stack.node.dependencies.filter(x => Stack.of(x.source) === stack).map(x => Stack.of(x.target)),
  ]
    .filter(x => x !== stack)
    .reduce<Stack[]>((res, item) => {
      if (!res.includes(item)) {
        res.push(item, ...findStackDependencies(item));
      }
      return res;
    }, []);

  return deps;
};

const stackNames = (stacks: Array<Stack | string>): string[] => {
  return stacks.map(x => (typeof x === 'string' ? x : x.stackName));
};
