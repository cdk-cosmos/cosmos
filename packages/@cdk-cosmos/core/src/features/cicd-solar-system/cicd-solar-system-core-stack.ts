import { Construct } from '@aws-cdk/core';
import { Role } from '@aws-cdk/aws-iam';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { ISolarSystemCore, SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { CdkPipeline, CdkPipelineProps } from '../../components/cdk-pipeline';

export const CDK_PIPELINE_PATTERN = '{Partition}{Cosmos}{Resource}';
export const CDK_PIPELINE_STACK_PATTERN = '{Partition}{Cosmos}{Resource}';

export interface ICiCdFeatureCore extends Construct {
  readonly solarSystem: ISolarSystemCore;
  readonly deployProject?: IProject;
}

export interface CiCdFeatureCoreStackProps extends BaseFeatureStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps> & { useSolarSystemVpc?: boolean };
}

export class CiCdFeatureCoreStack extends BaseFeatureStack implements ICiCdFeatureCore {
  readonly solarSystem: ISolarSystemCore;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(solarSystem: ISolarSystemCore, id: string, props?: CiCdFeatureCoreStackProps) {
    super(solarSystem, id, props);

    const { cdkPipelineProps } = props || {};
    const { useSolarSystemVpc = false } = cdkPipelineProps || {};

    this.solarSystem = solarSystem;

    const cdkMasterRoleStaticArn = this.solarSystem.galaxy.cosmos.cdkMasterRoleStaticArn;
    const cdkRepo = this.solarSystem.galaxy.cosmos.cdkRepo;

    this.deployPipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', cdkMasterRoleStaticArn, {
        mutable: false,
      }),
      deployStacks: [this.solarSystem.nodeId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      deployVpc: useSolarSystemVpc ? this.solarSystem.vpc : undefined,
      deploySubnets: { subnetGroupName: 'App' },
      ...cdkPipelineProps,
      pipelineName: this.solarSystem.nodeId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: this.solarSystem.nodeId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: cdkRepo,
    });
    this.deployProject = this.deployPipeline.deploy;
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

SolarSystemCoreStack.prototype.addCiCd = function(props?: CiCdFeatureCoreStackProps): CiCdFeatureCoreStack {
  this.ciCd = new CiCdFeatureCoreStack(this, 'CiCd', props);
  return this.ciCd;
};
