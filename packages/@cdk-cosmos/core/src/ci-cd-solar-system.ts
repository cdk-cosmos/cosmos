import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import { IGalaxyExtension, IGalaxyCore } from './galaxy';
import { CdkPipelineProps, CdkPipeline } from './components/cdk-pipeline';
import {
  SolarSystemExtensionStackProps,
  ISolarSystemCore,
  ISolarSystemExtension,
  SolarSystemCoreStackProps,
  SolarSystemCoreStack,
  SolarSystemExtensionStack,
  ImportedSolarSystemCore,
} from './solar-system';

const CDK_PIPELINE_PATTERN = '{Partition}{Cosmos}{Resource}';
const CDK_PIPELINE_STACK_PATTERN = '{Partition}{Cosmos}{Resource}';

export interface ICiCdSolarSystemCore extends ISolarSystemCore {
  deployProject?: IProject;
}

export interface CiCdSolarSystemCoreStackProps extends SolarSystemCoreStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemCoreStack extends SolarSystemCoreStack implements ICiCdSolarSystemCore {
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(galaxy: IGalaxyCore, props?: CiCdSolarSystemCoreStackProps) {
    super(galaxy, 'CiCd', {
      description: 'Cosmos CiCdSolarSystem: Resources dependant on Ci & Cd, like CodePipelines and CodeDeployments.',
      ...props,
    });

    const { cdkPipelineProps } = props || {};

    this.deployPipeline = new CosmosCdkPipeline(this, 'CdkPipeline', cdkPipelineProps);
    this.deployProject = this.deployPipeline.Deploy;
  }
}

export interface ICiCdSolarSystemExtension extends ISolarSystemExtension {
  portal: ICiCdSolarSystemCore;
  deployProject: IProject;
}

export interface CiCdSolarSystemExtensionStackProps extends SolarSystemExtensionStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemExtensionStack extends SolarSystemExtensionStack implements ICiCdSolarSystemExtension {
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

  protected getPortal(props?: CiCdSolarSystemExtensionStackProps): ICiCdSolarSystemCore {
    const galaxy = this.node.scope as IGalaxyExtension;
    return new ImportedSolarSystemCore(galaxy.portal, this.node.id, props?.portalProps);
  }
}

export class CosmosCdkPipeline extends CdkPipeline {
  constructor(scope: ISolarSystemCore | ISolarSystemExtension, id: string, props?: Partial<CdkPipelineProps>) {
    const cdkRepo = scope.galaxy.cosmos.cdkRepo;
    const cdkMasterRoleStaticArn =
      (scope as ISolarSystemCore).galaxy.cosmos.cdkMasterRoleStaticArn ||
      (scope as ISolarSystemExtension).galaxy.cosmos.portal.cdkMasterRoleStaticArn;
    // const vpc = (scope as ISolarSystemCore).vpc || (scope as ISolarSystemExtension).portal.vpc;

    super(scope, id, {
      deployRole: Role.fromRoleArn(scope, 'CdkMasterRole', cdkMasterRoleStaticArn, { mutable: false }),
      deployStacks: [scope.nodeId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      ...props,
      pipelineName: scope.nodeId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: scope.nodeId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: cdkRepo,
      // deployVpc: vpc,
    });
  }
}
