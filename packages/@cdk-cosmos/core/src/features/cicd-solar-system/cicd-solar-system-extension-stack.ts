import { Construct } from '@aws-cdk/core';
import { Role } from '@aws-cdk/aws-iam';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { ISolarSystemExtension, SolarSystemExtensionStack } from '../../solar-system/solar-system-extension-stack';
import { BaseConstruct, BaseConstructProps } from '../../components/base';
import { CdkPipeline, CdkPipelineProps } from '../../components/cdk-pipeline';
import { CDK_PIPELINE_STACK_PATTERN, CDK_PIPELINE_PATTERN } from './cicd-solar-system-core-stack';

export interface ICiCdFeatureExtension extends Construct {
  readonly solarSystem: ISolarSystemExtension;
  readonly deployProject?: IProject;
}

export interface CiCdFeatureExtensionStackProps extends BaseConstructProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSFeatureExtensionStack extends BaseConstruct implements ICiCdFeatureExtension {
  readonly solarSystem: ISolarSystemExtension;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(solarSystem: ISolarSystemExtension, id: string, props?: CiCdFeatureExtensionStackProps) {
    super(solarSystem, id, props);

    const { cdkPipelineProps } = props || {};

    this.solarSystem = solarSystem;

    const cdkMasterRoleStaticArn = this.solarSystem.galaxy.cosmos.portal.cdkMasterRoleStaticArn;
    const cdkRepo = this.solarSystem.galaxy.cosmos.cdkRepo;

    this.deployPipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', cdkMasterRoleStaticArn, {
        mutable: false,
      }),
      deployStacks: [this.solarSystem.nodeId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      ...cdkPipelineProps,
      pipelineName: this.solarSystem.nodeId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: this.solarSystem.nodeId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: cdkRepo,
      // deployVpc: vpc,
    });
    this.deployProject = this.deployPipeline.deploy;
  }
}

declare module '../../solar-system/solar-system-extension-stack' {
  export interface ISolarSystemExtension {
    readonly ciCd?: ICiCdFeatureExtension;
  }

  interface SolarSystemExtensionStack {
    ciCd?: CiCdSFeatureExtensionStack;
    addCiCd(props?: CiCdFeatureExtensionStackProps): CiCdSFeatureExtensionStack;
  }
}

SolarSystemExtensionStack.prototype.addCiCd = function(
  props?: CiCdFeatureExtensionStackProps
): CiCdSFeatureExtensionStack {
  this.ciCd = new CiCdSFeatureExtensionStack(this, 'CiCd', props);
  return this.ciCd;
};
