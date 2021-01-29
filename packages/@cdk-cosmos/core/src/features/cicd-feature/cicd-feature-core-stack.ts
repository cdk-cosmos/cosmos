import { Construct } from '@aws-cdk/core';
import { Role } from '@aws-cdk/aws-iam';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { IRepository, Repository, RepositoryProps } from '@aws-cdk/aws-codecommit';
import { ISolarSystemCore, SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { CdkPipeline, CdkPipelineProps, AddDeployStackStageProps } from '@cosmos-building-blocks/pipeline';

export const CDK_PIPELINE_PATTERN = '{Partition}{Cosmos}{Resource}';

export interface ICiCdFeatureCore extends Construct {
  readonly solarSystem: ISolarSystemCore;
  readonly cdkRepo?: IRepository;
  readonly deployProject?: IProject;
}

export interface CiCdFeatureCoreStackProps extends BaseFeatureStackProps {
  cdkRepoProps: Partial<RepositoryProps>;
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdFeatureCoreStack extends BaseFeatureStack implements ICiCdFeatureCore {
  readonly solarSystem: ISolarSystemCore;
  readonly cdkRepo?: Repository;
  readonly cdkPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(solarSystem: ISolarSystemCore, id: string, props?: CiCdFeatureCoreStackProps) {
    super(solarSystem, id, {
      description: 'Add CiCd Features to the SolarSystem',
      ...props,
    });

    const { cdkRepoProps, cdkPipelineProps } = props || {};

    this.solarSystem = solarSystem;

    const cdkMasterRoleStaticArn = this.solarSystem.galaxy.cosmos.cdkMasterRoleStaticArn;

    if (!cdkPipelineProps?.cdkRepo && !cdkPipelineProps?.cdkSource) {
      this.cdkRepo = new Repository(this.solarSystem.galaxy.cosmos, 'CdkRepo', {
        description: `Core CDK Repo for ${this.solarSystem.galaxy.cosmos.node.id} Cosmos.`,
        ...cdkRepoProps,
        repositoryName: this.solarSystem.galaxy.cosmos.nodeId('Cdk-Repo', '-').toLowerCase(),
      });
    }

    this.cdkPipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', cdkMasterRoleStaticArn, {
        mutable: false,
      }),
      cdkRepo: this.cdkRepo,
      ...cdkPipelineProps,
      pipelineName: this.solarSystem.nodeId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: this.solarSystem.nodeId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
    });
    this.deployProject = this.cdkPipeline.deploy;
  }

  addDeployStackStage(props: AddDeployStackStageProps): void {
    this.cdkPipeline.addDeployStackStage(props);
  }
}

declare module '../../solar-system/solar-system-core-stack' {
  export interface ISolarSystemCore {
    readonly ciCd?: ICiCdFeatureCore;
  }

  interface SolarSystemCoreStack {
    ciCd?: CiCdFeatureCoreStack;
    addCiCd(props?: CiCdFeatureCoreStackProps): CiCdFeatureCoreStack;
  }
}

SolarSystemCoreStack.prototype.addCiCd = function (props?: CiCdFeatureCoreStackProps): CiCdFeatureCoreStack {
  this.ciCd = new CiCdFeatureCoreStack(this, 'CiCd', props);
  return this.ciCd;
};
