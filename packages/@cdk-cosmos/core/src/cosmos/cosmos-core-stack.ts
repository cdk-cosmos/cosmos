import { Construct, Stack, CfnOutput, Tag } from '@aws-cdk/core';
import { HostedZone, IPublicHostedZone } from '@aws-cdk/aws-route53';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Role, ServicePrincipal, ManagedPolicy, CompositePrincipal } from '@aws-cdk/aws-iam';
import { NetworkBuilder } from '@aws-cdk/aws-ec2/lib/network-util';
import { createCrossAccountExportProvider } from '@cosmos-building-blocks/common';
import { BaseStack, BaseStackProps } from '../components/base';
import { RemoteZone, RemoteCodeRepo } from '../components/remote';
import { getPackageVersion } from '../helpers/utils';
import { ICosmosCoreLink, CosmosCoreLinkStack } from './cosmoc-core-link-stack';

export interface ICosmosCore extends Construct {
  networkBuilder?: NetworkBuilder;
  link?: ICosmosCoreLink;
  libVersion: string;
  cdkRepo: IRepository;
  rootZone: IPublicHostedZone;
  cdkMasterRoleStaticArn: string;
  crossAccountExportServiceToken: string;
}

export interface CosmosCoreStackProps extends BaseStackProps {
  tld: string;
}

export class CosmosCoreStack extends BaseStack implements ICosmosCore {
  readonly libVersion: string;
  readonly link: ICosmosCoreLink;
  readonly cdkRepo: Repository;
  readonly rootZone: HostedZone;
  readonly cdkMasterRole: Role;
  readonly cdkMasterRoleStaticArn: string;
  readonly crossAccountExportServiceToken: string;

  constructor(scope: Construct, id: string, props: CosmosCoreStackProps) {
    super(scope, id, {
      description: 'Cosmos: Singleton resources for the Cosmos, like RootZone, CdkRepo and CdkMasterRole',
      partition: 'Core',
      type: 'Cosmos',
      ...props,
    });

    const { tld } = props;

    this.libVersion = getPackageVersion();
    this.link = new CosmosCoreLinkStack(this);

    this.cdkRepo = new Repository(this, 'CdkRepo', {
      repositoryName: this.nodeId('Cdk-Repo', '-').toLowerCase(),
      description: `Core CDK Repo for ${this.node.id} Cosmos.`,
    });

    this.rootZone = new HostedZone(this, 'RootZone', {
      zoneName: `${tld}`.toLowerCase(),
      comment: `Core TLD Root Zone for ${this.node.id} Cosmos.`,
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

    this.crossAccountExportServiceToken = createCrossAccountExportProvider(this, this.cdkMasterRole);

    new CfnOutput(this, 'CoreLibVersion', {
      exportName: this.singletonId('LibVersion'),
      value: this.libVersion,
    });
    RemoteCodeRepo.export(this.cdkRepo, this.singletonId('CdkRepo'));
    RemoteZone.export(this.rootZone, this.singletonId('RootZone'));
    // RemoteFunction.export(this.crossAccountExportsFn, this.singletonId('CrossAccountExportsFn'));
    new CfnOutput(this, 'CrossAccountExportServiceToken', {
      exportName: this.singletonId('CrossAccountExportServiceToken'),
      value: this.crossAccountExportServiceToken,
    });
    this.cdkMasterRoleStaticArn = `arn:aws:iam::${Stack.of(this).account}:role/${cdkMasterRoleName}`;

    Tag.add(this, 'cosmos', this.node.id);
  }
}
