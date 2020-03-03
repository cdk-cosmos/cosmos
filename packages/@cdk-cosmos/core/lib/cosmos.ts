import { Construct, Stack, StackProps, CfnOutput, Fn, Environment } from '@aws-cdk/core';
import { HostedZone, IHostedZone } from '@aws-cdk/aws-route53';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Role, ServicePrincipal, ManagedPolicy, CompositePrincipal } from '@aws-cdk/aws-iam';
import package_json from '../package.json';
import {
  ICosmos,
  IGalaxy,
  ISolarSystem,
  ICosmosExtension,
  RemoteZone,
  RemoteCodeRepo,
  ISolarSystemExtension,
  IGalaxyExtension,
} from '.';

export interface CosmosStackProps extends StackProps {
  tld: string;
  rootZone?: string;
  env: Environment;
}

export class CosmosStack extends Stack implements ICosmos {
  readonly Scope: Construct;
  readonly Galaxies: IGalaxy[];
  readonly SolarSystems: ISolarSystem[];
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: Repository;
  readonly RootZone: HostedZone;
  readonly CdkMasterRole: Role;
  readonly CdkMasterRoleStaticArn: string;

  constructor(app: Construct, name: string, props: CosmosStackProps) {
    super(app, 'Cosmos-Core', props);

    const { tld, rootZone = name.toLowerCase() } = props;

    this.Scope = app;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Name = name;
    this.Version = package_json.version;

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
        new ServicePrincipal('codepipeline.amazonaws.com'),
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

  AddGalaxy(galaxy: IGalaxy) {
    this.Galaxies.push(galaxy);
    galaxy.node.addDependency(this);
  }
  AddSolarSystem(solarSystem: ISolarSystem) {
    this.SolarSystems.push(solarSystem);
    solarSystem.node.addDependency(this);
  }
}

export class ImportedCosmos extends Construct implements ICosmos {
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

  AddGalaxy() {}
  AddSolarSystem() {}
}

export class CosmosExtensionStack extends Stack implements ICosmosExtension {
  readonly Scope: Construct;
  readonly Galaxies: Array<IGalaxy | IGalaxyExtension>;
  readonly SolarSystems: Array<ISolarSystem | ISolarSystemExtension>;
  readonly Portal: ICosmos;
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: IRepository;

  constructor(scope: Construct, name: string, props?: StackProps) {
    super(scope, `Cosmos-App-${name}`, props);

    this.Scope = scope;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Portal = new ImportedCosmos(this, this.account);
    this.Name = name;
    this.Version = package_json.version;

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: `app-${this.Name}-cdk-repo`.toLocaleLowerCase(),
    });
  }

  AddGalaxy(galaxy: IGalaxy | IGalaxyExtension) {
    this.Galaxies.push(galaxy);
    galaxy.node.addDependency(this);
  }
  AddSolarSystem(solarSystem: ISolarSystem | ISolarSystemExtension) {
    this.SolarSystems.push(solarSystem);
    solarSystem.node.addDependency(this);
  }
}
