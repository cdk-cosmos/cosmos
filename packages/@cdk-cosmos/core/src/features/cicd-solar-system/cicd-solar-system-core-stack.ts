import { Role } from '@aws-cdk/aws-iam';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { ISolarSystemCore, SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { BaseNestedStackProps, BaseNestedStack } from '../../components/base';
import { CdkPipeline, CdkPipelineProps } from '../../components/cdk-pipeline';

export const CDK_PIPELINE_PATTERN = '{Partition}{Cosmos}{Resource}';
export const CDK_PIPELINE_STACK_PATTERN = '{Partition}{Cosmos}{Resource}';

export interface ICiCdSolarSystemCore {
  readonly solarSystem: ISolarSystemCore;
  readonly deployProject?: IProject;
}

export interface CiCdSolarSystemCoreStackProps extends BaseNestedStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemCoreStack extends BaseNestedStack implements ICiCdSolarSystemCore {
  readonly solarSystem: ISolarSystemCore;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(solarSystem: ISolarSystemCore, id: string, props?: CiCdSolarSystemCoreStackProps) {
    super(solarSystem, id, {
      ...props,
      type: 'Feature',
    });

    const { cdkPipelineProps } = props || {};

    this.solarSystem = solarSystem;

    const cdkMasterRoleStaticArn = this.solarSystem.galaxy.cosmos.cdkMasterRoleStaticArn;
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

declare module '../../solar-system/solar-system-core-stack' {
  export interface ISolarSystemCore {
    readonly cicd?: ICiCdSolarSystemCore;
  }
  interface SolarSystemCoreStack {
    cicd?: CiCdSolarSystemCoreStack;
    addCiCd(props?: CiCdSolarSystemCoreStackProps): CiCdSolarSystemCoreStack;
  }
}

SolarSystemCoreStack.prototype.addCiCd = function(props?: CiCdSolarSystemCoreStackProps): CiCdSolarSystemCoreStack {
  this.cicd = new CiCdSolarSystemCoreStack(this, 'CiCd', props);
  return this.cicd;
};
