import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { Role, ArnPrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Cosmos, Galaxy, SolarSystem, CosmosExtension, GalaxyExtension } from '.';
import { SolarSystemExtension } from './interfaces';

export interface GalaxyStackProps extends StackProps {
  cidr: string;
}

export class GalaxyStack extends Stack implements Galaxy {
  readonly Type = 'Galaxy';
  readonly Cosmos: Cosmos;
  readonly SolarSystems: SolarSystem[];
  readonly Name: string;
  readonly NetworkBuilder: NetworkBuilder;
  readonly CdkCrossAccountRole?: Role;

  constructor(cosmos: Cosmos, name: string, props: GalaxyStackProps) {
    super(cosmos.Scope, `Cosmos-Core-Galaxy-${name}`, {
      ...props,
      env: {
        account: props.env?.account || cosmos.account,
        region: props.env?.region || cosmos.region,
      },
    });

    const { cidr } = props;

    this.Cosmos = cosmos;
    this.Cosmos.AddGalaxy(this);
    this.SolarSystems = [];
    this.Name = name;
    this.NetworkBuilder = new NetworkBuilder(cidr);

    // If cross account then create cross account role
    if (this.Cosmos.account !== this.account) {
      this.CdkCrossAccountRole = new Role(this, 'CdkCrossAccountRole', {
        roleName: `Core-CdkCrossAccount-Role`,
        assumedBy: new ArnPrincipal(this.Cosmos.CdkMasterRoleStaticArn),
      });
      this.CdkCrossAccountRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    }
  }

  AddSolarSystem(solarSystem: SolarSystem): void {
    this.SolarSystems.push(solarSystem);
    this.Cosmos.AddSolarSystem(solarSystem);
  }
}

export class ImportedGalaxy extends Construct implements Galaxy {
  readonly Type = 'Galaxy';
  readonly Cosmos: Cosmos;
  readonly Name: string;

  constructor(scope: Construct, cosmos: Cosmos, name: string) {
    super(scope, `Cosmos-Core-Galaxy-${name}`);

    this.Cosmos = cosmos;
    this.Name = name;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  AddSolarSystem(): void {}
}

export class GalaxyExtensionStack extends Stack implements GalaxyExtension {
  readonly Type = 'GalaxyExtension';
  readonly Cosmos: CosmosExtension;
  readonly SolarSystems: Array<SolarSystem | SolarSystemExtension>;
  readonly Portal: Galaxy;
  readonly Name: string;

  constructor(cosmos: CosmosExtension, name: string, props?: StackProps) {
    super(cosmos.Scope, `Cosmos-App-${cosmos.Name}-Galaxy-${name}`, {
      ...props,
      env: {
        account: props?.env?.account || cosmos.account,
        region: props?.env?.region || cosmos.region,
      },
    });

    this.Cosmos = cosmos;
    this.Cosmos.AddGalaxy(this);
    this.SolarSystems = [];
    this.Portal = new ImportedGalaxy(this, this.Cosmos.Portal, name);
    this.Name = name;
  }

  AddSolarSystem(solarSystem: SolarSystem | SolarSystemExtension): void {
    this.SolarSystems.push(solarSystem);
    this.Cosmos.AddSolarSystem(solarSystem);
  }
}
