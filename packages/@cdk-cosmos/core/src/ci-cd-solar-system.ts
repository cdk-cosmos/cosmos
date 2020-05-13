import { Construct } from '@aws-cdk/core';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import {
  IEcsSolarSystemCore,
  EcsSolarSystemCoreStack,
  EcsSolarSystemCoreProps,
  ImportedEcsSolarSystemCore,
} from './ecs-solar-system';
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

export interface ICiCdEcsSolarSystemCore extends IEcsSolarSystemCore {
  deployProject?: IProject;
}

// Extensions

export interface ICiCdSolarSystemExtension<T extends ICiCdSolarSystemCore> extends Construct {
  galaxy: IGalaxyExtension;
  portal: T;
  deployProject: IProject;
}

class CosmosCdkPipeline extends CdkPipeline {
  constructor(scope: ISolarSystemCore | ISolarSystemExtension, id: string, props?: Partial<CdkPipelineProps>) {
    const cdkRepo = scope.galaxy.cosmos.cdkRepo;
    const cdkMasterRoleStaticArn =
      (scope as ISolarSystemCore).galaxy.cosmos.cdkMasterRoleStaticArn ||
      (scope as ISolarSystemExtension).galaxy.cosmos.portal.cdkMasterRoleStaticArn;
    // const vpc = (scope as ISolarSystemCore).vpc || (scope as ISolarSystemExtension).portal.vpc;

    super(scope, id, {
      deployRole: Role.fromRoleArn(scope, 'CdkMasterRole', cdkMasterRoleStaticArn, { mutable: false }),
      deployStacks: [scope.generateId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      ...props,
      pipelineName: scope.generateId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: scope.generateId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: cdkRepo,
      // deployVpc: vpc,
    });
  }
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

export interface CiCdEcsSolarSystemCoreStackProps extends EcsSolarSystemCoreProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdEcsSolarSystemCoreStack extends EcsSolarSystemCoreStack implements ICiCdSolarSystemCore {
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

export interface CiCdSolarSystemExtensionStackProps extends SolarSystemExtensionStackProps {
  ecs?: boolean;
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemExtensionStack<T extends ICiCdSolarSystemCore = ICiCdSolarSystemCore>
  extends SolarSystemExtensionStack
  implements ICiCdSolarSystemExtension<T> {
  readonly portal: T;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(galaxy: IGalaxyExtension, props?: CiCdSolarSystemExtensionStackProps) {
    super(galaxy, 'CiCd', {
      description:
        'Cosmos CiCdSolarSystem Extension: App resources dependant on Ci & Cd, like CodePipelines and CodeDeployments.',
      ...props,
    });

    const { ecs, cdkPipelineProps, portalProps } = props || {};

    this.node.tryRemoveChild(this.portal.node.id);
    this.portal = (ecs
      ? new ImportedEcsSolarSystemCore(this, "'CiCd'", this.galaxy.portal, portalProps)
      : new ImportedSolarSystemCore(this, "'CiCd'", this.galaxy.portal, portalProps)) as T;

    this.deployPipeline = new CosmosCdkPipeline(this, 'CdkPipeline', cdkPipelineProps);
    this.deployProject = this.deployPipeline.Deploy;
  }
}
