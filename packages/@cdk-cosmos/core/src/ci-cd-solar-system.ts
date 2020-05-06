import { Construct } from '@aws-cdk/core';
import { Project, IProject } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import {
  IEcsSolarSystemCore,
  IEcsSolarSystemExtension,
  EcsSolarSystemCoreStack,
  EcsSolarSystemCoreProps,
  ImportedEcsSolarSystemCore,
  EcsSolarSystemExtensionStack,
} from './ecs-solar-system';
import { BaseStackOptions } from './components/base';
import { IGalaxyExtension, IGalaxyCore } from './galaxy';
import { CdkPipelineProps, CdkPipeline } from './components/cdk-pipeline';

const CDK_PIPELINE_PATTERN = '{Partition}{Cosmos}{Resource}';
const CDK_PIPELINE_STACK_PATTERN = '{Partition}{Cosmos}{Resource}';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ICiCdSolarSystemCore extends IEcsSolarSystemCore {}

// Extensions

export interface ICiCdSolarSystemExtension extends IEcsSolarSystemExtension {
  portal: ICiCdSolarSystemCore;
  deployProject: IProject;
}

export interface CiCdSolarSystemCoreStackProps extends EcsSolarSystemCoreProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemCoreStack extends EcsSolarSystemCoreStack implements ICiCdSolarSystemCore {
  readonly CdkDeploy: Project;

  constructor(galaxy: IGalaxyCore, props?: CiCdSolarSystemCoreStackProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps = {} } = props || {};
    const { cdkRepo, cdkMasterRoleStaticArn } = this.galaxy.cosmos;

    const pipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', cdkMasterRoleStaticArn, { mutable: false }),
      deployStacks: [this.generateId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      ...cdkPipelineProps,
      pipelineName: this.generateId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: this.generateId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: cdkRepo,
      // deployVpc: this.Vpc,
    });
    this.CdkDeploy = pipeline.Deploy;

    // RemoteBuildProject.export(`Core${this.Account.Name}${this.Name}`, this.CdkDeploy);
  }
}

export class ImportedCiCdSolarSystemCore extends ImportedEcsSolarSystemCore implements ICiCdSolarSystemCore {
  // readonly CdkDeploy: IProject;

  constructor(scope: Construct, galaxy: IGalaxyCore) {
    super(scope, 'CiCd', galaxy);

    // this.CdkDeploy = RemoteBuildProject.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'CdkPipelineDeploy');
  }
}

export interface CiCdSolarSystemExtensionStackProps extends BaseStackOptions {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemExtensionStack extends EcsSolarSystemExtensionStack implements ICiCdSolarSystemExtension {
  readonly portal: IEcsSolarSystemCore;
  readonly deployPipeline: CdkPipeline;
  readonly deployProject: Project;

  constructor(galaxy: IGalaxyExtension, props?: CiCdSolarSystemExtensionStackProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps } = props || {};

    this.node.tryRemoveChild(this.portal.node.id);
    this.portal = new ImportedCiCdSolarSystemCore(this, this.galaxy.portal);

    this.deployPipeline = new CdkPipeline(this, 'CdkPipeline', {
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', this.galaxy.cosmos.portal.cdkMasterRoleStaticArn, {
        mutable: false,
      }),
      deployStacks: [this.generateId('*', '', CDK_PIPELINE_STACK_PATTERN)],
      ...cdkPipelineProps,
      pipelineName: this.generateId('Cdk-Pipeline', '-', CDK_PIPELINE_PATTERN),
      deployName: this.generateId('Cdk-Deploy', '-', CDK_PIPELINE_PATTERN),
      cdkRepo: this.galaxy.cosmos.cdkRepo,
    });
    this.deployProject = this.deployPipeline.Deploy;
  }
}
