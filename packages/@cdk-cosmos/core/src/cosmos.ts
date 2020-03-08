import * as fs from 'fs';
import * as path from 'path';
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

const stackName = (partition: string, name: string): string =>
  RESOLVE(PATTERN.COSMOS, 'Cosmos', { Partition: partition, Name: name });

const getPackageVersion: () => string = () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../package.json')).toString();
  return JSON.parse(file).version as string;
};

export interface CosmosStackProps extends StackProps {
  tld: string;
  rootZone?: string;
  env: Environment;
}

export class CosmosStack extends Stack implements Cosmos {
  readonly Partition = 'Core';
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
    super(app, stackName('Core', name), {
      ...props,
      description: 'Singleton resources for the cosmos, like RootZone, CdkRepo and CdkMasterRole',
    });

    const { tld, rootZone = name.toLowerCase() } = props;

    this.Scope = app;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Name = name;
    this.Version = getPackageVersion();

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: RESOLVE(PATTERN.SINGLETON_COSMOS, 'Cdk-Repo', this).toLowerCase(),
    });

    this.RootZone = new HostedZone(this, 'RootZone', {
      zoneName: `${rootZone}.${tld}`.toLowerCase(),
    });

    const CdkMasterRoleName = RESOLVE(PATTERN.SINGLETON_COSMOS, 'CdkMaster-Role', this);
    this.CdkMasterRole = new Role(this, 'CdkMasterRole', {
      roleName: CdkMasterRoleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('codebuild.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com')
      ),
    });
    this.CdkMasterRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${this.account}:role/${CdkMasterRoleName}`;

    new CfnOutput(this, 'CosmosName', {
      exportName: RESOLVE(PATTERN.SINGLETON_COSMOS, 'Name', this),
      value: this.Name,
    });
    new CfnOutput(this, 'CosmosVersion', {
      exportName: RESOLVE(PATTERN.SINGLETON_COSMOS, 'Version', this),
      value: this.Version,
    });
    RemoteCodeRepo.export(this.CdkRepo, RESOLVE(PATTERN.SINGLETON_COSMOS, 'CdkRepo', this));
    RemoteZone.export(this.RootZone, RESOLVE(PATTERN.SINGLETON_COSMOS, 'RootZone', this));
  }

  AddGalaxy(galaxy: Galaxy): void {
    this.Galaxies.push(galaxy);
  }
  AddSolarSystem(solarSystem: SolarSystem): void {
    this.SolarSystems.push(solarSystem);
  }
}

export class ImportedCosmos extends Construct implements Cosmos {
  readonly Partition = 'Core';
  readonly Scope: Construct;
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: IRepository;
  readonly RootZone: IHostedZone;
  readonly CdkMasterRoleStaticArn: string;

  constructor(scope: Construct, account: string) {
    super(scope, 'CosmosImport');

    this.Scope = scope;
    this.Name = Fn.importValue(RESOLVE(PATTERN.SINGLETON_COSMOS, 'Name', this));
    this.Version = Fn.importValue(RESOLVE(PATTERN.SINGLETON_COSMOS, 'Version', this));
    this.CdkRepo = RemoteCodeRepo.import(this, RESOLVE(PATTERN.SINGLETON_COSMOS, 'CdkRepo', this));
    this.RootZone = RemoteZone.import(this, RESOLVE(PATTERN.SINGLETON_COSMOS, 'RootZone', this));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${account}:role/Core-CdkMaster-Role`;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  AddGalaxy(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  AddSolarSystem(): void {}
}

export class CosmosExtensionStack extends Stack implements CosmosExtension {
  readonly Partition = 'App';
  readonly Scope: Construct;
  readonly Galaxies: Array<Galaxy | GalaxyExtension>;
  readonly SolarSystems: Array<SolarSystem | SolarSystemExtension>;
  readonly Portal: Cosmos;
  readonly Name: string;
  readonly Version: string;
  readonly CdkRepo: IRepository;

  constructor(scope: Construct, name: string, props?: StackProps) {
    super(scope, stackName('App', name), {
      ...props,
      description: 'Singleton Resources for Application like AppCDKRepo, ECRRepo etc',
    });

    this.Scope = scope;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Portal = new ImportedCosmos(this, this.account);
    this.Name = name;
    this.Version = getPackageVersion();

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: RESOLVE(PATTERN.COSMOS, 'Cdk-Repo', this).toLocaleLowerCase(),
    });
  }

  AddGalaxy(galaxy: Galaxy | GalaxyExtension): void {
    this.Galaxies.push(galaxy);
  }
  AddSolarSystem(solarSystem: SolarSystem | SolarSystemExtension): void {
    this.SolarSystems.push(solarSystem);
  }
}
