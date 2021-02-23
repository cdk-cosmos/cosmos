import { Construct } from '@aws-cdk/core';
import { Role } from '@aws-cdk/aws-iam';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { ISolarSystemExtension, SolarSystemExtensionStack } from '../../solar-system/solar-system-extension-stack';
import { BaseFeatureConstruct, BaseFeatureConstructProps } from '../../components/base';
import { CdkPipeline, CdkPipelineProps, AddDeployStackStageProps } from '@cosmos-building-blocks/pipeline';
import { CDK_PIPELINE_PATTERN } from './cicd-feature-core-stack';

export interface ICiCdFeatureExtension extends Construct {
  readonly solarSystem: ISolarSystemExtension;
  readonly cdkRepo?: IRepository;
  readonly deployProject?: IProject;
}

export interface CiCdFeatureExtensionStackProps extends BaseFeatureConstructProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdFeatureExtensionStack extends BaseFeatureConstruct implements ICiCdFeatureExtension {
  readonly solarSystem: ISolarSystemExtension;
  readonly cdkRepo?: Repository;
  readonly cdkPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(solarSystem: ISolarSystemExtension, id: string, props?: CiCdFeatureExtensionStackProps) {
    super(solarSystem, id, props);

    const { cdkPipelineProps } = props || {};

    this.solarSystem = solarSystem;

    const cdkMasterRoleStaticArn = this.solarSystem.galaxy.cosmos.portal.cdkMasterRoleStaticArn;

    if (!cdkPipelineProps?.cdkRepo && !cdkPipelineProps?.cdkSource) {
      this.cdkRepo = new Repository(this.solarSystem.galaxy.cosmos, 'CdkRepo', {
        repositoryName: this.solarSystem.galaxy.cosmos.nodeId('Cdk-Repo', '-').toLowerCase(),
        description: `App CDK Repo for ${this.solarSystem.galaxy.cosmos.node.id} Cosmos.`,
      });
    }

    this.cdkPipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', cdkMasterRoleStaticArn, {
        mutable: false,
      }),
      cdkRepo: this.cdkRepo,
      deployDiffStage: false,
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

declare module '../../solar-system/solar-system-extension-stack' {
  export interface ISolarSystemExtension {
    readonly ciCd?: ICiCdFeatureExtension;
  }

  interface SolarSystemExtensionStack {
    ciCd?: CiCdFeatureExtensionStack;
    addCiCd(props?: CiCdFeatureExtensionStackProps): CiCdFeatureExtensionStack;
  }
}

SolarSystemExtensionStack.prototype.addCiCd = function (
  props?: CiCdFeatureExtensionStackProps
): CiCdFeatureExtensionStack {
  this.ciCd = new CiCdFeatureExtensionStack(this, 'CiCd', props);
  return this.ciCd;
};
