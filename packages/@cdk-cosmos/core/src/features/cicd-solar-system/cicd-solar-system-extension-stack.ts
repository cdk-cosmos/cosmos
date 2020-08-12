import { Role } from '@aws-cdk/aws-iam';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { ISolarSystemExtension, SolarSystemExtensionStack } from '../../solar-system/solar-system-extension-stack';
import { BaseConstruct, BaseConstructProps } from '../../components/base';
import { CdkPipeline, CdkPipelineProps } from '../../components/cdk-pipeline';
import { CDK_PIPELINE_STACK_PATTERN, CDK_PIPELINE_PATTERN } from './cicd-solar-system-core-stack';

export interface ICiCdSolarSystemExtension {
  readonly solarSystem: ISolarSystemExtension;
  readonly deployProject?: IProject;
}

export interface CiCdSolarSystemExtensionStackProps extends BaseConstructProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemExtensionStack extends BaseConstruct implements ICiCdSolarSystemExtension {
  readonly solarSystem: ISolarSystemExtension;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(solarSystem: ISolarSystemExtension, id: string, props?: CiCdSolarSystemExtensionStackProps) {
    super(solarSystem, id, {
      ...props,
      type: 'Feature',
    });

    const { cdkPipelineProps } = props || {};

    this.solarSystem = solarSystem;

    this.deployPipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(
        this,
        'CdkMasterRole',
        this.solarSystem.galaxy.cosmos.portal.cdkMasterRoleStaticArn,
        {
          mutable: false,
        }
      ),
      deployStacks: [this.solarSystem.nodeId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      ...cdkPipelineProps,
      pipelineName: this.solarSystem.nodeId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: this.solarSystem.nodeId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: this.solarSystem.galaxy.cosmos.cdkRepo,
      // deployVpc: vpc,
    });
    this.deployProject = this.deployPipeline.deploy;
  }
}

declare module '../../solar-system/solar-system-extension-stack' {
  export interface ISolarSystemExtension {
    readonly cicd?: ICiCdSolarSystemExtension;
  }
  interface SolarSystemExtensionStack {
    cicd?: CiCdSolarSystemExtensionStack;
    addCiCd(props?: CiCdSolarSystemExtensionStackProps): CiCdSolarSystemExtensionStack;
  }
}

SolarSystemExtensionStack.prototype.addCiCd = function(
  props?: CiCdSolarSystemExtensionStackProps
): CiCdSolarSystemExtensionStack {
  this.cicd = new CiCdSolarSystemExtensionStack(this, 'CiCd', props);
  return this.cicd;
};
