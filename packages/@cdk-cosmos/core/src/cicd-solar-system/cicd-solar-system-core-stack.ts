import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import { IGalaxyCore } from '../galaxy/galaxy-core-stack';
import {
  ISolarSystemCore,
  SolarSystemCoreStackProps,
  SolarSystemCoreStack,
} from '../solar-system/solar-system-core-stack';
import { EcsSolarSystemCoreStack } from '../ecs-solar-system/ecs-solar-system-core-stack';
import { ISolarSystemExtension } from '../solar-system/solar-system-extension-stack';
import { CdkPipelineProps, CdkPipeline } from '../components/cdk-pipeline';

export interface ICiCdSolarSystemCore extends ISolarSystemCore {
  deployProject?: IProject;
}

export interface CiCdSolarSystemCoreStackProps extends SolarSystemCoreStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const CiCdSolarSystemCoreStackBuilder = (base: typeof SolarSystemCoreStack) => {
  class CiCdSolarSystemCoreStack extends base implements ICiCdSolarSystemCore {
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

  return CiCdSolarSystemCoreStack;
};

export const CiCdSolarSystemCoreStack = CiCdSolarSystemCoreStackBuilder(SolarSystemCoreStack);
export const CiCdEcsSolarSystemCoreStack = CiCdSolarSystemCoreStackBuilder(EcsSolarSystemCoreStack);

// Components

const CDK_PIPELINE_PATTERN = '{Partition}{Cosmos}{Resource}';
const CDK_PIPELINE_STACK_PATTERN = '{Partition}{Cosmos}{Resource}';

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
