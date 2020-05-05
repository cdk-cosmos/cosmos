import * as fs from 'fs';
import * as path from 'path';
import { Construct, Stack, StackProps, CfnOutput, Fn } from '@aws-cdk/core';
import { HostedZone, IHostedZone, IPublicHostedZone } from '@aws-cdk/aws-route53';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Role, ServicePrincipal, ManagedPolicy, CompositePrincipal } from '@aws-cdk/aws-iam';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { CrossAccountExportsFn } from '@cosmos-building-blocks/common';
import { IFunction, Function } from '@aws-cdk/aws-lambda';
import { BaseStack, BaseConstruct, BaseStackProps } from './base';
import { RemoteZone, RemoteCodeRepo, RemoteFunction } from '.';

export interface ICosmosCore extends Construct {
  Link?: ICosmosCoreLink;
  LibVersion: string;
  CdkRepo: IRepository;
  RootZone: IPublicHostedZone;
  CdkMasterRoleStaticArn: string;
  CrossAccountExportsFn: IFunction;
  NetworkBuilder?: NetworkBuilder;
}

export interface CosmosCoreProps {
  tld: string;
  cidr?: string;
}

export class CosmosCore extends BaseConstruct implements ICosmosCore {
  readonly LibVersion: string;
  readonly Link: ICosmosCoreLink;
  readonly CdkRepo: Repository;
  readonly RootZone: HostedZone;
  readonly CdkMasterRole: Role;
  readonly CdkMasterRoleStaticArn: string;
  readonly CrossAccountExportsFn: Function;

  constructor(scope: Construct, name: string, props: CosmosCoreProps) {
    super(scope, name, {
      ...props,
      type: 'Cosmos',
    });

    const { tld } = props;

    this.LibVersion = getPackageVersion();
    this.Link = new CosmosLinkStack(this);

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: this.generateId('Cdk-Repo', '-').toLowerCase(),
      description: `Core CDK Repo for ${name} Cosmos.`,
    });

    this.RootZone = new HostedZone(this, 'RootZone', {
      zoneName: `${tld}`.toLowerCase(),
      comment: `Core TLD Root Zone for ${name} Cosmos.`,
    });

    const CdkMasterRoleName = this.singletonId('CdkMasterRole');
    this.CdkMasterRole = new Role(this, 'CdkMasterRole', {
      roleName: CdkMasterRoleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('codebuild.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com'),
        new ServicePrincipal('lambda.amazonaws.com')
      ),
    });
    this.CdkMasterRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    this.CrossAccountExportsFn = new CrossAccountExportsFn(this, 'CrossAccountExportsFn', {
      role: this.CdkMasterRole,
    });

    new CfnOutput(this, 'CoreName', {
      exportName: this.singletonId('Name'),
      value: name,
    });
    new CfnOutput(this, 'CoreLibVersion', {
      exportName: this.singletonId('LibVersion'),
      value: this.LibVersion,
    });
    RemoteCodeRepo.export(this.CdkRepo, this.singletonId('CdkRepo'));
    RemoteZone.export(this.RootZone, this.singletonId('RootZone'));
    RemoteFunction.export(this.CrossAccountExportsFn, this.singletonId('CrossAccountExportsFn'));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${CdkMasterRoleName}`;
  }
}

export class ImportedCosmosCore extends BaseConstruct implements ICosmosCore {
  readonly Name: string;
  readonly LibVersion: string;
  readonly CdkRepo: IRepository;
  readonly RootZone: IHostedZone;
  readonly CdkMasterRoleStaticArn: string;
  readonly CrossAccountExportsFn: IFunction;

  constructor(scope: Construct, name: string) {
    super(scope, name, { type: 'Cosmos' });

    const account = Stack.of(scope).account;

    this.Name = Fn.importValue(this.singletonId('Name'));
    this.LibVersion = Fn.importValue(this.singletonId('LibVersion'));
    this.CdkRepo = RemoteCodeRepo.import(this, this.singletonId('CdkRepo'));
    this.RootZone = RemoteZone.import(this, this.singletonId('RootZone'));
    this.CrossAccountExportsFn = RemoteFunction.import(this, this.singletonId('CrossAccountExportsFn'));
    this.CdkMasterRoleStaticArn = `arn:aws:iam::${account}:role/${this.singletonId('CDKMasterRole')}`;
  }
}

export interface CosmosCoreStackProps extends CosmosCoreProps, Partial<BaseStackProps> {}

export class CosmosCoreStack extends BaseStack<CosmosCore> {
  constructor(app: Construct, name: string, props: CosmosCoreStackProps) {
    super(app, name, {
      description: 'Cosmos: Singleton resources for the Cosmos, like RootZone, CdkRepo and CdkMasterRole',
      partition: 'Core',
      ...props,
      type: 'Cosmos',
    });

    this._resource = new CosmosCore(this, name, props);
  }
}

export interface ICosmosCoreLink {
  Cosmos: ICosmosCore;
}

export class CosmosLinkStack extends BaseStack<never> implements ICosmosCoreLink {
  readonly Cosmos: ICosmosCore;

  constructor(cosmos: ICosmosCore, props?: StackProps) {
    super(cosmos, 'Link', {
      description: 'Cosmos: Resources to link the Cosmos, like Route53 zone delegation',
      ...props,
      type: 'Link',
    });

    this.Cosmos = cosmos;
  }
}

export interface ICosmosExtension extends Construct {
  Portal: ICosmosCore;
  LibVersion: string;
  CdkRepo: IRepository;
}

export class CosmosExtension extends BaseConstruct implements ICosmosExtension {
  readonly Portal: ICosmosCore;
  readonly LibVersion: string;
  readonly CdkRepo: IRepository;

  constructor(scope: Construct, name: string) {
    super(scope, name, {
      type: 'Cosmos',
    });

    this.Portal = new ImportedCosmosCore(this, name);
    this.LibVersion = getPackageVersion();

    this.CdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: this.generateId('Cdk-Repo', '-').toLowerCase(),
      description: `App CDK Repo for ${name} Cosmos.`,
    });
  }
}

export class CosmosExtensionStack extends BaseStack<CosmosExtension> {
  constructor(scope: Construct, name: string, props?: Partial<BaseStackProps>) {
    super(scope, name, {
      partition: 'App',
      ...props,
      type: 'Cosmos',
    });

    this._resource = new CosmosExtension(this, name);
  }
}

const getPackageVersion: () => string = () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../package.json')).toString();
  return JSON.parse(file).version as string;
};
