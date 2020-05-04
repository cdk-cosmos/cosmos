import { Project } from '@aws-cdk/aws-codebuild';
import { Role } from '@aws-cdk/aws-iam';
import {
  PATTERN,
  Galaxy,
  EcsSolarSystem,
  CiCdSolarSystem,
  CiCdEcsSolarSystem,
  GalaxyExtension,
  EcsSolarSystemStack,
  EcsSolarSystemProps,
  ImportedEcsSolarSystem,
  EcsSolarSystemExtensionStack,
  CiCdSolarSystemExtension,
  CiCdEcsSolarSystemExtension,
  CdkPipeline,
  CdkPipelineProps,
  SolarSystem,
  SolarSystemStack,
  SolarSystemProps,
  SolarSystemExtensionStack,
} from '.';
import { SolarSystemExtension } from './interfaces';
import { SolarSystemExtensionStackProps, ImportedSolarSystem } from './solar-system';

// TODO: We need a better pattern

export interface CiCdStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

const createCdkPipeline = (solarSystem: SolarSystem, cdkPipelineProps?: Partial<CdkPipelineProps>): CdkPipeline => {
  const { CdkRepo, CdkMasterRoleStaticArn } = solarSystem.Galaxy.Cosmos;

  return new CdkPipeline(solarSystem, 'CdkPipeline', {
    deployRole: Role.fromRoleArn(solarSystem, 'CdkMasterRole', CdkMasterRoleStaticArn, { mutable: false }),
    deployStacks: [solarSystem.RESOLVE(PATTERN.COSMOS, '*')],
    ...cdkPipelineProps,
    name: solarSystem.RESOLVE(PATTERN.SINGLETON_COSMOS, 'Cdk-Pipeline'),
    cdkRepo: CdkRepo,
    // deployVpc: this.Vpc,
  });
};

export class CiCdSolarSystemStack extends SolarSystemStack implements CiCdSolarSystem {
  readonly CdkPipeline: CdkPipeline;
  readonly CdkDeploy: Project;

  constructor(galaxy: Galaxy, props?: CiCdStackProps & SolarSystemProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps = {} } = props || {};

    this.CdkPipeline = createCdkPipeline(this, cdkPipelineProps);
    this.CdkDeploy = this.CdkPipeline.Deploy;

    // RemoteBuildProject.export(`Core${this.Account.Name}${this.Name}`, this.CdkDeploy);
  }
}

export class CiCdEcsSolarSystemStack extends EcsSolarSystemStack implements CiCdEcsSolarSystem {
  readonly CdkPipeline: CdkPipeline;
  readonly CdkDeploy: Project;

  constructor(galaxy: Galaxy, props?: CiCdStackProps & EcsSolarSystemProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps = {} } = props || {};

    this.CdkPipeline = createCdkPipeline(this, cdkPipelineProps);
    this.CdkDeploy = this.CdkPipeline.Deploy;

    // RemoteBuildProject.export(`Core${this.Account.Name}${this.Name}`, this.CdkDeploy);
  }
}

const creatExtensionCdkPipeline = (
  solarSystem: SolarSystemExtension,
  cdkPipelineProps?: Partial<CdkPipelineProps>
): CdkPipeline => {
  const { CdkMasterRoleStaticArn } = solarSystem.Galaxy.Cosmos.Portal;
  const { CdkRepo } = solarSystem.Galaxy.Cosmos;

  return new CdkPipeline(solarSystem, 'CdkPipeline', {
    deployRole: Role.fromRoleArn(solarSystem, 'CdkMasterRole', CdkMasterRoleStaticArn, { mutable: false }),
    deployStacks: [solarSystem.RESOLVE(PATTERN.COSMOS, '*')],
    ...cdkPipelineProps,
    name: solarSystem.RESOLVE(PATTERN.COSMOS, 'Cdk-Pipeline'),
    cdkRepo: CdkRepo,
    // deployVpc: this.Vpc,
  });
};

export interface CiCdExtensionStackProps {
  cdkPipelineProps?: Partial<CdkPipelineProps>;
}

export class CiCdSolarSystemExtensionStack extends SolarSystemExtensionStack implements CiCdSolarSystemExtension {
  readonly Portal: SolarSystem;
  readonly DeployPipeline: CdkPipeline;
  readonly DeployProject: Project;

  constructor(galaxy: GalaxyExtension, props?: CiCdExtensionStackProps & SolarSystemExtensionStackProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps } = props || {};

    this.node.tryRemoveChild(this.Portal.node.id);
    this.Portal = new ImportedSolarSystem(this, this.Galaxy.Portal, {
      name: 'CiCd',
      vpcProps: props?.vpcProps,
    });

    this.DeployPipeline = creatExtensionCdkPipeline(this, cdkPipelineProps);
    this.DeployProject = this.DeployPipeline.Deploy;
  }
}

export class CiCdEcsSolarSystemExtensionStack extends EcsSolarSystemExtensionStack
  implements CiCdEcsSolarSystemExtension {
  readonly Portal: EcsSolarSystem;
  readonly DeployPipeline: CdkPipeline;
  readonly DeployProject: Project;

  constructor(galaxy: GalaxyExtension, props?: CiCdExtensionStackProps & SolarSystemExtensionStackProps) {
    super(galaxy, 'CiCd', props);

    const { cdkPipelineProps } = props || {};

    this.node.tryRemoveChild(this.Portal.node.id);
    this.Portal = new ImportedEcsSolarSystem(this, this.Galaxy.Portal, {
      name: 'CiCd',
      vpcProps: props?.vpcProps,
    });

    this.DeployPipeline = creatExtensionCdkPipeline(this, cdkPipelineProps);
    this.DeployProject = this.DeployPipeline.Deploy;
  }
}
