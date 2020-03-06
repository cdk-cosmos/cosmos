import * as fs from 'fs';
import { Construct, Stack, StackProps, CfnOutput, Fn, Environment } from '@aws-cdk/core';
import { HostedZone, IHostedZone } from '@aws-cdk/aws-route53';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Role, ServicePrincipal, ManagedPolicy, CompositePrincipal } from '@aws-cdk/aws-iam';
import {
  RESOLVE,
  PATTERN,
  Cosmos,
  Galaxy,
  SolarSystem,
  CosmosExtension,
  RemoteZone,
  RemoteCodeRepo,
  SolarSystemExtension,
  GalaxyExtension,
} from '.';

const getPackageVersion: () => string = () => {
  const file = fs.readFileSync('../package.json').toString();
  return JSON.parse(file).version as string;
};

export interface CosmosStackProps extends StackProps {
  tld: string;
  rootZone?: string;
  env: Environment;
}

export class CosmosStack extends Stack implements Cosmos {
  readonly Type = 'Cosmos';
  readonly Scope: Construct;
  readonly Galaxies: Galaxy[];
  readonly SolarSystems: SolarSystem[];
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: Repository;
  readonly RootZone: HostedZone;
  readonly CdkMasterRole: Role;
  readonly CdkMasterRoleStaticArn: string;

  constructor(app: Construct, name: string, props: CosmosStackProps) {
    super(app, RESOLVE(PATTERN.COSMOS, { Type: 'Cosmos', Name: name }), props);

    const { tld, rootZone = name.toLowerCase() } = props;

    this.Scope = app;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Name = name;
    this.Version = getPackageVersion();

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: `core-cdk-repo`,
    });

    this.RootZone = new HostedZone(this, 'RootZone', {
      zoneName: `${rootZone}.${tld}`.toLowerCase(),
    });

    this.CdkMasterRole = new Role(this, 'CdkMasterRole', {
      roleName: 'Core-CdkMaster-Role',
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('codebuild.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com')
      ),
    });
    this.CdkMasterRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${this.account}:role/Core-CdkMaster-Role`;

    new CfnOutput(this, 'CosmosCoreName', {
      exportName: `CosmosCoreName`,
      value: this.Name,
    });
    new CfnOutput(this, 'CosmosCoreVersion', {
      exportName: `CosmosCoreVersion`,
      value: this.Version,
    });
    RemoteCodeRepo.export('CosmosCore', this.CdkRepo);
    RemoteZone.export('CosmosCore', this.RootZone);
  }

  AddGalaxy(galaxy: Galaxy): void {
    this.Galaxies.push(galaxy);
  }
  AddSolarSystem(solarSystem: SolarSystem): void {
    this.SolarSystems.push(solarSystem);
  }
}

export class ImportedCosmos extends Construct implements Cosmos {
  readonly Type = 'Cosmos';
  readonly Scope: Construct;
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: IRepository;
  readonly RootZone: IHostedZone;
  readonly CdkMasterRoleStaticArn: string;

  constructor(scope: Construct, account: string) {
    super(scope, 'Cosmos-Core');

    this.Scope = scope;
    this.Name = Fn.importValue('CosmosCoreName');
    this.Version = Fn.importValue('CosmosCoreVersion');
    this.CdkRepo = RemoteCodeRepo.import(this, 'CosmosCore', 'CdkRepo');
    this.RootZone = RemoteZone.import(this, 'CosmosCore', 'RootZone');
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${account}:role/Core-CdkMaster-Role`;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  AddGalaxy(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  AddSolarSystem(): void {}
}

export class CosmosExtensionStack extends Stack implements CosmosExtension {
  readonly Type = 'CosmosExtension';
  readonly Scope: Construct;
  readonly Galaxies: Array<Galaxy | GalaxyExtension>;
  readonly SolarSystems: Array<SolarSystem | SolarSystemExtension>;
  readonly Portal: Cosmos;
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: IRepository;

  constructor(scope: Construct, name: string, props?: StackProps) {
    super(scope, RESOLVE(PATTERN.COSMOS, { Type: 'CosmosExtension', Name: name }), props);

    this.Scope = scope;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Portal = new ImportedCosmos(this, this.account);
    this.Name = name;
    this.Version = getPackageVersion();

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: `app-${this.Name}-cdk-repo`.toLocaleLowerCase(),
    });
  }

  AddGalaxy(galaxy: Galaxy | GalaxyExtension): void {
    this.Galaxies.push(galaxy);
  }
  AddSolarSystem(solarSystem: SolarSystem | SolarSystemExtension): void {
    this.SolarSystems.push(solarSystem);
  }
}
