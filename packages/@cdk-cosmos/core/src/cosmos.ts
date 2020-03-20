import * as fs from 'fs';
import * as path from 'path';
import { Construct, Stack, StackProps, CfnOutput, Fn } from '@aws-cdk/core';
import { HostedZone, IHostedZone } from '@aws-cdk/aws-route53';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Role, ServicePrincipal, ManagedPolicy, CompositePrincipal } from '@aws-cdk/aws-iam';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { CrossAccountExportsFn } from '@cosmos-building-blocks/common';
import {
  RESOLVE,
  PATTERN,
  Cosmos,
  CosmosLink,
  CosmosExtension,
  Galaxy,
  GalaxyExtension,
  SolarSystem,
  SolarSystemExtension,
  RemoteZone,
  RemoteCodeRepo,
  RemoteFunction,
} from '.';
import { IFunction, Function } from '@aws-cdk/aws-lambda';

const stackName = (partition: string, name: string): string =>
  RESOLVE(PATTERN.COSMOS, 'Cosmos', { Partition: partition, Name: name });

const getPackageVersion: () => string = () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../package.json')).toString();
  return JSON.parse(file).version as string;
};

export class CosmosLinkStack extends Stack implements CosmosLink {
  readonly Cosmos: Cosmos;
  readonly Name: string;

  constructor(cosmos: Cosmos, props: StackProps) {
    super(cosmos.Scope, RESOLVE(PATTERN.COSMOS, 'CosmosLink', cosmos), {
      ...props,
      description: 'Resources to link the Cosmos, like Route53 zone delegation',
    });

    this.Cosmos = cosmos;
    this.Name = 'Link';
  }
}

export interface CosmosStackProps extends StackProps {
  tld: string;
  cidr?: string;
  rootZone?: string;
}

export class CosmosStack extends Stack implements Cosmos {
  readonly Partition = 'Core';
  readonly Scope: Construct;
  readonly Galaxies: Galaxy[];
  readonly SolarSystems: SolarSystem[];
  readonly Name: string;
  readonly Version: string;
  readonly Link: CosmosLink;
  readonly NetworkBuilder?: NetworkBuilder;
  readonly CdkRepo: Repository;
  readonly RootZone: HostedZone;
  readonly CdkMasterRole: Role;
  readonly CdkMasterRoleStaticArn: string;
  readonly CrossAccountExportsFn: Function;

  constructor(app: Construct, name: string, props: CosmosStackProps) {
    super(app, stackName('Core', name), {
      ...props,
      description: 'Singleton resources for the cosmos, like RootZone, CdkRepo and CdkMasterRole',
    });

    const { tld, cidr, rootZone = name.toLowerCase() } = props;

    this.Scope = app;
    this.Galaxies = [];
    this.SolarSystems = [];
    this.Name = name;
    this.Version = getPackageVersion();
    if (cidr) this.NetworkBuilder = new NetworkBuilder(cidr);
    this.Link = new CosmosLinkStack(this, {
      env: { account: this.account, region: this.region },
    });

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
        new ServicePrincipal('codepipeline.amazonaws.com'),
        new ServicePrincipal('lambda.amazonaws.com')
      ),
    });
    this.CdkMasterRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${this.account}:role/${CdkMasterRoleName}`;

    this.CrossAccountExportsFn = new CrossAccountExportsFn(this, 'CrossAccountExportsFn', {
      role: this.CdkMasterRole,
    });

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
    RemoteFunction.export(this.CrossAccountExportsFn, RESOLVE(PATTERN.SINGLETON_COSMOS, 'CrossAccountExportsFn', this));
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
  readonly CrossAccountExportsFn: IFunction;

  constructor(scope: Construct) {
    super(scope, 'CosmosImport');

    const account = Stack.of(scope).account;

    this.Scope = scope;
    this.Name = Fn.importValue(RESOLVE(PATTERN.SINGLETON_COSMOS, 'Name', this));
    this.Version = Fn.importValue(RESOLVE(PATTERN.SINGLETON_COSMOS, 'Version', this));
    this.CdkRepo = RemoteCodeRepo.import(this, RESOLVE(PATTERN.SINGLETON_COSMOS, 'CdkRepo', this));
    this.RootZone = RemoteZone.import(this, RESOLVE(PATTERN.SINGLETON_COSMOS, 'RootZone', this));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${account}:role/Core-CdkMaster-Role`;
    this.CrossAccountExportsFn = RemoteFunction.import(
      this,
      RESOLVE(PATTERN.SINGLETON_COSMOS, 'CrossAccountExportsFn', this)
    );
  }

  /* eslint-disable @typescript-eslint/no-empty-function */
  // istanbul ignore next
  AddGalaxy(): void {}

  // istanbul ignore next
  AddSolarSystem(): void {}
  /* eslint-enable @typescript-eslint/no-empty-function */
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
    this.Portal = new ImportedCosmos(this);
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
