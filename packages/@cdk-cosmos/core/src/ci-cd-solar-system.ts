import { Construct, StackProps } from '@aws-cdk/core';

import { Project } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import {
  PATTERN,
  Galaxy,
  EcsSolarSystem,
  CiCdSolarSystem,
  GalaxyExtension,
  EcsSolarSystemStack,
  EcsSolarSystemProps,
  ImportedEcsSolarSystem,
  EcsSolarSystemExtensionStack,
  CiCdSolarSystemExtension,
  CdkPipeline,
  CdkPipelineProps,
} from '.';

export interface CiCdStackProps extends EcsSolarSystemProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemStack extends EcsSolarSystemStack implements CiCdSolarSystem {
  readonly CdkDeploy: Project;

  constructor(galaxy: Galaxy, props?: CiCdStackProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps = {} } = props || {};
    const { CdkRepo, CdkMasterRoleStaticArn } = this.Galaxy.Cosmos;

    const pipeline = new CdkPipeline(this, 'CdkPipeline', {
      name: this.RESOLVE(PATTERN.SINGLETON_COSMOS, 'Cdk-Pipeline'),
      cdkRepo: CdkRepo,
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', CdkMasterRoleStaticArn, { mutable: false }),
      // deployVpc: this.Vpc,
      deployStacks: [this.RESOLVE(PATTERN.COSMOS, '*')],
      ...cdkPipelineProps,
    });
    this.CdkDeploy = pipeline.Deploy;

    // RemoteBuildProject.export(`Core${this.Account.Name}${this.Name}`, this.CdkDeploy);
  }
}

export class ImportedCiCdSolarSystem extends ImportedEcsSolarSystem implements CiCdSolarSystem {
  // readonly CdkDeploy: IProject;

  constructor(scope: Construct, galaxy: Galaxy) {
    super(scope, galaxy, 'CiCd');

    // this.CdkDeploy = RemoteBuildProject.import(this, `Core${this.Galaxy.Name}${this.Name}`, 'CdkPipelineDeploy');
  }
}

export class CiCdSolarSystemExtensionStack extends EcsSolarSystemExtensionStack implements CiCdSolarSystemExtension {
  readonly Portal: EcsSolarSystem;
  readonly DeployPipeline: CdkPipeline;
  readonly DeployProject: Project;

  constructor(galaxy: GalaxyExtension, props?: StackProps) {
    super(galaxy, 'CiCd', props);

    this.node.tryRemoveChild(this.Portal.node.id);
    this.Portal = new ImportedCiCdSolarSystem(this, this.Galaxy.Portal);

    this.DeployPipeline = new CdkPipeline(this, 'CdkPipeline', {
      name: `App-${this.Galaxy.Cosmos.Name}-Cdk-Pipeline`,
      cdkRepo: this.Galaxy.Cosmos.CdkRepo,
      deployRole: Role.fromRoleArn(this, 'CdkMasterRole', this.Galaxy.Cosmos.Portal.CdkMasterRoleStaticArn, {
        mutable: false,
      }),
      deployStacks: [this.RESOLVE(PATTERN.COSMOS, '*')],
    });
    this.DeployProject = this.DeployPipeline.Deploy;
  }
}
