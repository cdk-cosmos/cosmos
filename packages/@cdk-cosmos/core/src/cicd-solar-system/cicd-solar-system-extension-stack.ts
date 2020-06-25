import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { IGalaxyExtension } from '../galaxy/galaxy-extension-stack';
import {
  ISolarSystemExtension,
  SolarSystemExtensionStackProps,
  SolarSystemExtensionStack,
} from '../solar-system/solar-system-extension-stack';
import { EcsSolarSystemExtensionStack } from '../ecs-solar-system/ecs-solar-system-extension-stack';
import { ICiCdSolarSystemCore, CosmosCdkPipeline } from './cicd-solar-system-core-stack';
import { CdkPipelineProps, CdkPipeline } from '../components/cdk-pipeline';
import { ClassType } from '../helpers/utils';

export interface ICiCdSolarSystemExtension extends ISolarSystemExtension {
  portal: ICiCdSolarSystemCore;
  deployProject: IProject;
}

export interface CiCdSolarSystemExtensionStackProps extends SolarSystemExtensionStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const CiCdSolarSystemExtensionStackBuilder = (base: typeof SolarSystemExtensionStack) => {
  class CiCdSolarSystemExtensionStack extends base implements ICiCdSolarSystemExtension {
    readonly portal: ICiCdSolarSystemCore;
    readonly deployPipeline: CdkPipeline;
    readonly deployProject: Project;

    constructor(galaxy: IGalaxyExtension, props?: CiCdSolarSystemExtensionStackProps) {
      super(galaxy, 'CiCd', {
        description:
          'Cosmos CiCdSolarSystem Extension: App resources dependant on Ci & Cd, like CodePipelines and CodeDeployments.',
        ...props,
      });

      const { cdkPipelineProps } = props || {};

      this.deployPipeline = new CosmosCdkPipeline(this, 'CdkPipeline', cdkPipelineProps);
      this.deployProject = this.deployPipeline.Deploy;
    }
  }

  return CiCdSolarSystemExtensionStack as ClassType<typeof CiCdSolarSystemExtensionStack>;
};

export const CiCdSolarSystemExtensionStack = CiCdSolarSystemExtensionStackBuilder(SolarSystemExtensionStack);
export const CiCdEcsSolarSystemExtensionStack = CiCdSolarSystemExtensionStackBuilder(EcsSolarSystemExtensionStack);
