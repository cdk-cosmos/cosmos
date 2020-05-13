import * as fs from 'fs';
import * as path from 'path';
import { Construct, Stack, StackProps, CfnOutput, Fn } from '@aws-cdk/core';
import { HostedZone, IHostedZone, IPublicHostedZone } from '@aws-cdk/aws-route53';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Role, ServicePrincipal, ManagedPolicy, CompositePrincipal } from '@aws-cdk/aws-iam';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { CrossAccountExportsFn } from '@cosmos-building-blocks/common';
import { IFunction, Function } from '@aws-cdk/aws-lambda';
import { BaseStack, BaseStackOptions, COSMOS_PARTITION } from './components/base';
import { RemoteZone, RemoteCodeRepo, RemoteFunction } from './helpers/remote';

export interface ICosmosCore extends Construct {
  link?: ICosmosCoreLink;
  libVersion: string;
  cdkRepo: IRepository;
  rootZone: IPublicHostedZone;
  cdkMasterRoleStaticArn: string;
  crossAccountExportsFn: IFunction;
  networkBuilder?: NetworkBuilder;
}

export interface ICosmosCoreLink extends Construct {
  cosmos: ICosmosCore;
}

export interface ICosmosExtension extends Construct {
  portal: ICosmosCore;
  libVersion: string;
  cdkRepo: IRepository;
}

export interface CosmosCoreStackProps extends BaseStackOptions {
  tld: string;
}

export class CosmosCoreStack extends BaseStack implements ICosmosCore {
  readonly libVersion: string;
  readonly link: ICosmosCoreLink;
  readonly cdkRepo: Repository;
  readonly rootZone: HostedZone;
  readonly cdkMasterRole: Role;
  readonly cdkMasterRoleStaticArn: string;
  readonly crossAccountExportsFn: Function;

  constructor(scope: Construct, id: string, props: CosmosCoreStackProps) {
    super(scope, id, {
      description: 'Cosmos: Singleton resources for the Cosmos, like RootZone, CdkRepo and CdkMasterRole',
      partition: 'Core',
      ...props,
      type: 'Cosmos',
    });

    const { tld } = props;

    this.libVersion = getPackageVersion();
    this.link = new CosmosLinkStack(this);

    this.cdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: this.generateId('Cdk-Repo', '-').toLowerCase(),
      description: `Core CDK Repo for ${id} Cosmos.`,
    });

    this.rootZone = new HostedZone(this, 'RootZone', {
      zoneName: `${tld}`.toLowerCase(),
      comment: `Core TLD Root Zone for ${id} Cosmos.`,
    });

    const cdkMasterRoleName = this.singletonId('CdkMasterRole');
    this.cdkMasterRole = new Role(this, 'CdkMasterRole', {
      roleName: cdkMasterRoleName,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('codebuild.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com'),
        new ServicePrincipal('lambda.amazonaws.com')
      ),
    });
    this.cdkMasterRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    this.crossAccountExportsFn = new CrossAccountExportsFn(this, 'CrossAccountExportsFn', {
      role: this.cdkMasterRole,
    });

    new CfnOutput(this, 'CoreId', {
      exportName: this.singletonId('Id'),
      value: id,
    });
    new CfnOutput(this, 'CoreLibVersion', {
      exportName: this.singletonId('LibVersion'),
      value: this.libVersion,
    });
    RemoteCodeRepo.export(this.cdkRepo, this.singletonId('CdkRepo'));
    RemoteZone.export(this.rootZone, this.singletonId('RootZone'));
    RemoteFunction.export(this.crossAccountExportsFn, this.singletonId('CrossAccountExportsFn'));
    this.cdkMasterRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${cdkMasterRoleName}`;
  }
}

export class ImportedCosmosCore extends Construct implements ICosmosCore {
  readonly id: string;
  readonly libVersion: string;
  readonly cdkRepo: IRepository;
  readonly rootZone: IHostedZone;
  readonly cdkMasterRoleStaticArn: string;
  readonly crossAccountExportsFn: IFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.node.type = 'Cosmos';
    this.node.setContext(COSMOS_PARTITION, 'Core');

    this.id = Fn.importValue(this.singletonId('Id'));
    this.libVersion = Fn.importValue(this.singletonId('LibVersion'));
    this.cdkRepo = RemoteCodeRepo.import(this, this.singletonId('CdkRepo'));
    this.rootZone = RemoteZone.import(this, this.singletonId('RootZone'));
    this.crossAccountExportsFn = RemoteFunction.import(this, this.singletonId('CrossAccountExportsFn'));
    this.cdkMasterRoleStaticArn = `arn:aws:iam::${Stack.of(scope).account}:role/${this.singletonId('CdkMasterRole')}`;
  }
}

export class CosmosLinkStack extends BaseStack implements ICosmosCoreLink {
  readonly cosmos: ICosmosCore;

  constructor(cosmos: ICosmosCore, props?: StackProps) {
    super(cosmos, 'Link', {
      description: 'Cosmos Link: Resources to link the Cosmos, like Route53 zone delegation',
      ...props,
      type: 'Link',
    });

    this.cosmos = cosmos;
  }
}

export class CosmosExtensionStack extends BaseStack implements ICosmosExtension {
  readonly portal: ICosmosCore;
  readonly libVersion: string;
  readonly cdkRepo: IRepository;

  constructor(scope: Construct, id: string, props?: BaseStackOptions) {
    super(scope, id, {
      description: 'Cosmos Extension: Singleton resources for the Cosmos, like CdkRepo and EcrRepo',
      partition: 'App',
      ...props,
      type: 'Cosmos',
    });

    this.portal = new ImportedCosmosCore(this, 'Default');
    this.libVersion = getPackageVersion();

    this.cdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: this.generateId('Cdk-Repo', '-').toLowerCase(),
      description: `App CDK Repo for ${id} Cosmos.`,
    });
  }
}

const getPackageVersion: () => string = () => {
  const file = fs.readFileSync(path.resolve(__dirname, '../package.json')).toString();
  return JSON.parse(file).version as string;
};
