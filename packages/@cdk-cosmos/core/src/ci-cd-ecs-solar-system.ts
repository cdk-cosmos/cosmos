import { Project } from '@aws-cdk/aws-codebuild';
import {
  IEcsSolarSystemCore,
  EcsSolarSystemCoreStack,
  EcsSolarSystemCoreProps,
  ImportedEcsSolarSystemCore,
  EcsSolarSystemExtensionStack,
  IEcsSolarSystemExtension,
} from './ecs-solar-system';
import { IGalaxyExtension, IGalaxyCore } from './galaxy';
import { CdkPipeline } from './components/cdk-pipeline';
import {
  ICiCdSolarSystemCore,
  ICiCdSolarSystemExtension,
  CiCdSolarSystemCoreStackProps,
  CiCdSolarSystemExtensionStackProps,
  CosmosCdkPipeline,
} from './ci-cd-solar-system';

export interface ICiCdEcsSolarSystemCore extends ICiCdSolarSystemCore, IEcsSolarSystemCore {}

export interface CiCdEcsSolarSystemCoreStackProps extends CiCdSolarSystemCoreStackProps, EcsSolarSystemCoreProps {}

export class CiCdEcsSolarSystemCoreStack extends EcsSolarSystemCoreStack implements ICiCdEcsSolarSystemCore {
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(galaxy: IGalaxyCore, props?: CiCdEcsSolarSystemCoreStackProps) {
    super(galaxy, 'CiCd', {
      description: 'Cosmos CiCdEcsSolarSystem: Resources dependant on Ci & Cd, like CodePipelines and CodeDeployments.',
      ...props,
    });

    const { cdkPipelineProps } = props || {};

    this.deployPipeline = new CosmosCdkPipeline(this, 'CdkPipeline', cdkPipelineProps);
    this.deployProject = this.deployPipeline.Deploy;
  }
}

export interface ICiCdEcsSolarSystemExtension extends ICiCdSolarSystemExtension, IEcsSolarSystemExtension {
  portal: ICiCdEcsSolarSystemCore;
}

export interface CiCdEcsSolarSystemExtensionStackProps extends CiCdSolarSystemExtensionStackProps {}

export class CiCdEcsSolarSystemExtensionStack extends EcsSolarSystemExtensionStack
  implements ICiCdEcsSolarSystemExtension {
  readonly portal: ICiCdEcsSolarSystemCore;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(galaxy: IGalaxyExtension, props?: CiCdEcsSolarSystemExtensionStackProps) {
    super(galaxy, 'CiCd', {
      description:
        'Cosmos CiCdEcsSolarSystem Extension: App resources dependant on Ci & Cd, like CodePipelines and CodeDeployments.',
      ...props,
    });

    const { cdkPipelineProps } = props || {};

    this.deployPipeline = new CosmosCdkPipeline(this, 'CdkPipeline', cdkPipelineProps);
    this.deployProject = this.deployPipeline.Deploy;
  }

  protected getPortal(props?: CiCdSolarSystemExtensionStackProps): ICiCdEcsSolarSystemCore {
    const galaxy = this.node.scope as IGalaxyExtension;
    return new ImportedEcsSolarSystemCore(galaxy.portal, this.node.id, props?.portalProps);
  }
}
