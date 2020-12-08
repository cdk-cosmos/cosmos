import { Construct, CfnOutput, Fn } from '@aws-cdk/core';
import { IHostedZone, HostedZone, PrivateHostedZone } from '@aws-cdk/aws-route53';
import { IVpc, Vpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import { ICluster, Cluster } from '@aws-cdk/aws-ecs';
import {
  IApplicationLoadBalancer,
  ApplicationLoadBalancer,
  IApplicationListener,
  ApplicationListener,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { IRepository as ICodeRepository, Repository as CodeRepository } from '@aws-cdk/aws-codecommit';
import { IProject, Project } from '@aws-cdk/aws-codebuild';
import { IFunction, Function } from '@aws-cdk/aws-lambda';

export class RemoteZone {
  readonly hostedZoneId: string;
  readonly zoneName: string;
  readonly hostedZoneNameServers?: string;

  constructor(zone: IHostedZone & Construct, exportName: string, scope: Construct = zone) {
    this.hostedZoneId = new CfnOutput(scope, 'ZoneId', {
      exportName: `${exportName}Id`,
      value: zone.hostedZoneId,
    }).exportName as string;
    this.zoneName = new CfnOutput(scope, 'ZoneName', {
      exportName: `${exportName}Name`,
      value: zone.zoneName,
    }).exportName as string;

    if (!(zone instanceof PrivateHostedZone)) {
      if (zone.hostedZoneNameServers) {
        this.hostedZoneNameServers = new CfnOutput(scope, 'ZoneNameServers', {
          exportName: `${exportName}NameServers`,
          value: Fn.join(',', zone.hostedZoneNameServers),
        }).exportName as string;
      }
    }
  }

  static import(scope: Construct, id: string, exportName: string): IHostedZone {
    const hostedZoneId = Fn.importValue(`${exportName}Id`);
    const zoneName = Fn.importValue(`${exportName}Name`);
    const hostedZoneNameServers = Fn.split(',', Fn.importValue(`${exportName}NameServers`));

    const zone = HostedZone.fromHostedZoneAttributes(scope, id, {
      hostedZoneId,
      zoneName,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (zone as any).hostedZoneNameServers = hostedZoneNameServers;
    return zone;
  }
}

export class RemoteVpcImportProps {
  aZs: number;
  isolatedSubnetNames?: string[];
  privateSubnetNames?: string[];
  publicSubnetNames?: string[];
}

export class RemoteVpc {
  readonly vpcId: string;
  readonly vpcCidrBlock: string;
  readonly availabilityZones: string;
  readonly isolatedSubnetIds?: string;
  readonly isolatedSubnetRouteTableIds?: string;
  readonly privateSubnetIds?: string;
  readonly privateSubnetRouteTableIds?: string;
  readonly publicSubnetIds?: string;
  readonly publicSubnetRouteTableIds?: string;

  constructor(vpc: IVpc & Construct, exportName: string, scope: Construct = vpc) {
    this.vpcId = new CfnOutput(scope, 'VpcId', {
      exportName: `${exportName}Id`,
      value: vpc.vpcId,
    }).exportName as string;
    this.vpcCidrBlock = new CfnOutput(scope, 'VpcCidrBlock', {
      exportName: `${exportName}CidrBlock`,
      value: vpc.vpcCidrBlock,
    }).exportName as string;
    this.availabilityZones = new CfnOutput(scope, 'VpcAZs', {
      exportName: `${exportName}AZs`,
      value: Fn.join(',', vpc.availabilityZones),
    }).exportName as string;

    if (vpc.isolatedSubnets.length) {
      this.isolatedSubnetIds = new CfnOutput(scope, 'VpcIsolatedSubnets', {
        exportName: `${exportName}IsolatedSubnetIds`,
        value: Fn.join(
          ',',
          vpc.isolatedSubnets.map(s => s.subnetId)
        ),
      }).exportName as string;
      this.isolatedSubnetRouteTableIds = new CfnOutput(scope, 'VpcIsolatedSubnetRouteTables', {
        exportName: `${exportName}IsolatedSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.isolatedSubnets.map(s => s.routeTable.routeTableId)
        ),
      }).exportName as string;
    }

    if (vpc.privateSubnets.length) {
      this.privateSubnetIds = new CfnOutput(scope, 'VpcPrivateSubnets', {
        exportName: `${exportName}PrivateSubnetIds`,
        value: Fn.join(
          ',',
          vpc.privateSubnets.map(s => s.subnetId)
        ),
      }).exportName as string;
      this.privateSubnetRouteTableIds = new CfnOutput(scope, 'VpcPrivateSubnetRouteTables', {
        exportName: `${exportName}PrivateSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.privateSubnets.map(s => s.routeTable.routeTableId)
        ),
      }).exportName as string;
    }

    if (vpc.publicSubnets.length) {
      this.publicSubnetIds = new CfnOutput(scope, 'VpcPublicSubnets', {
        exportName: `${exportName}PublicSubnetIds`,
        value: Fn.join(
          ',',
          vpc.publicSubnets.map(s => s.subnetId)
        ),
      }).exportName as string;
      this.publicSubnetRouteTableIds = new CfnOutput(scope, 'VpcPublicSubnetRouteTables', {
        exportName: `${exportName}PublicSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.publicSubnets.map(s => s.routeTable.routeTableId)
        ),
      }).exportName as string;
    }
  }

  static import(scope: Construct, id: string, exportName: string, props: RemoteVpcImportProps): IVpc {
    const { aZs, isolatedSubnetNames, privateSubnetNames, publicSubnetNames } = props;

    const vpcId = Fn.importValue(`${exportName}Id`);
    const vpcCidrBlock = Fn.importValue(`${exportName}CidrBlock`);
    const availabilityZones = expandCfnArray(Fn.split(',', Fn.importValue(`${exportName}AZs`)), aZs);

    const isolatedSubnetIds = expandSubnetIds(isolatedSubnetNames, `${exportName}IsolatedSubnetIds`, aZs);
    const isolatedSubnetRouteTableIds = expandSubnetIds(
      isolatedSubnetNames,
      `${exportName}IsolatedSubnetRouteTableIds`,
      aZs
    );

    const privateSubnetIds = expandSubnetIds(privateSubnetNames, `${exportName}PrivateSubnetIds`, aZs);
    const privateSubnetRouteTableIds = expandSubnetIds(
      privateSubnetNames,
      `${exportName}PrivateSubnetRouteTableIds`,
      aZs
    );

    const publicSubnetIds = expandSubnetIds(publicSubnetNames, `${exportName}PublicSubnetIds`, aZs);
    const publicSubnetRouteTableIds = expandSubnetIds(publicSubnetNames, `${exportName}PublicSubnetRouteTableIds`, aZs);

    return Vpc.fromVpcAttributes(scope, id, {
      vpcId,
      vpcCidrBlock,
      availabilityZones,
      isolatedSubnetNames,
      isolatedSubnetIds,
      isolatedSubnetRouteTableIds,
      privateSubnetNames,
      privateSubnetIds,
      privateSubnetRouteTableIds,
      publicSubnetNames,
      publicSubnetIds,
      publicSubnetRouteTableIds,
    });
  }
}

export class RemoteCluster {
  readonly clusterName: string;
  readonly securityGroupId: string;

  constructor(cluster: ICluster & Construct, exportName: string, scope: Construct = cluster) {
    this.clusterName = new CfnOutput(scope, 'ClusterName', {
      exportName: `${exportName}Name`,
      value: cluster.clusterName,
    }).exportName as string;
    this.securityGroupId = new CfnOutput(scope, 'ClusterSecurityGroup', {
      exportName: `${exportName}SecurityGroup`,
      value: cluster.connections.securityGroups[0].securityGroupId,
    }).exportName as string;
  }

  static import(scope: Construct, id: string, exportName: string, vpc: IVpc): ICluster {
    const clusterName = Fn.importValue(`${exportName}Name`);
    const securityGroups = [
      SecurityGroup.fromSecurityGroupId(scope, `${id}SecurityGroup`, Fn.importValue(`${exportName}SecurityGroup`)),
    ];

    return Cluster.fromClusterAttributes(scope, id, {
      clusterName,
      vpc,
      securityGroups,
    });
  }
}

export class RemoteAlb {
  readonly loadBalancerArn: string;
  readonly securityGroupId: string;
  readonly loadBalancerDnsName: string;
  readonly loadBalancerCanonicalHostedZoneId: string;

  constructor(alb: IApplicationLoadBalancer & Construct, exportName: string, scope: Construct = alb) {
    this.loadBalancerArn = new CfnOutput(scope, 'AlbArn', {
      exportName: `${exportName}Arn`,
      value: alb.loadBalancerArn,
    }).exportName as string;
    this.securityGroupId = new CfnOutput(scope, 'AlbSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: alb.connections.securityGroups[0].securityGroupId,
    }).exportName as string;
    this.loadBalancerDnsName = new CfnOutput(scope, 'AlbDnsName', {
      exportName: `${exportName}DnsName`,
      value: alb.loadBalancerDnsName,
    }).exportName as string;
    this.loadBalancerCanonicalHostedZoneId = new CfnOutput(scope, 'AlbDnsHostZoneId', {
      exportName: `${exportName}DnsHostZoneId`,
      value: alb.loadBalancerCanonicalHostedZoneId,
    }).exportName as string;
  }

  static import(scope: Construct, id: string, exportName: string, vpc: IVpc): IApplicationLoadBalancer {
    const loadBalancerArn = Fn.importValue(`${exportName}Arn`);
    const securityGroupId = Fn.importValue(`${exportName}SecurityGroupId`);
    const loadBalancerDnsName = Fn.importValue(`${exportName}DnsName`);
    const loadBalancerCanonicalHostedZoneId = Fn.importValue(`${exportName}DnsHostZoneId`);

    return ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(scope, id, {
      vpc,
      loadBalancerArn,
      securityGroupId,
      loadBalancerDnsName,
      loadBalancerCanonicalHostedZoneId,
    });
  }
}

export class RemoteApplicationListener {
  readonly listenerArn: string;
  readonly securityGroupId: string;

  constructor(listener: IApplicationListener & Construct, exportName: string, scope: Construct = listener) {
    this.listenerArn = new CfnOutput(scope, 'AlArn', {
      exportName: `${exportName}Arn`,
      value: listener.listenerArn,
    }).exportName as string;
    this.securityGroupId = new CfnOutput(scope, 'AlSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: listener.connections.securityGroups[0].securityGroupId,
    }).exportName as string;
  }

  static import(scope: Construct, id: string, exportName: string): IApplicationListener {
    const listenerArn = Fn.importValue(`${exportName}Arn`);
    const securityGroup = SecurityGroup.fromSecurityGroupId(
      scope,
      `${id}SecurityGroup`,
      Fn.importValue(`${exportName}SecurityGroupId`)
    );

    return ApplicationListener.fromApplicationListenerAttributes(scope, id, {
      listenerArn,
      securityGroup,
    });
  }
}

export class RemoteCodeRepo {
  readonly repositoryName: string;

  constructor(repo: ICodeRepository & Construct, exportName: string, scope: Construct = repo) {
    this.repositoryName = new CfnOutput(scope, 'RepoName', {
      exportName: `${exportName}Name`,
      value: repo.repositoryName,
    }).exportName as string;
  }

  static import(scope: Construct, id: string, exportName: string): ICodeRepository {
    const repoName = Fn.importValue(`${exportName}Name`);

    return CodeRepository.fromRepositoryName(scope, id, repoName);
  }
}

export class RemoteBuildProject {
  readonly projectName: string;

  constructor(project: IProject & Construct, exportName: string, scope: Construct = project) {
    this.projectName = new CfnOutput(scope, 'BuildProjectName', {
      exportName: `${exportName}Name`,
      value: project.projectName,
    }).exportName as string;
  }

  static import(scope: Construct, id: string, exportName: string): IProject {
    const repoName = Fn.importValue(`${exportName}Name`);

    return Project.fromProjectName(scope, id, repoName);
  }
}

export class RemoteFunction {
  readonly functionArn: string;

  constructor(fn: IFunction & Construct, exportName: string, scope: Construct = fn) {
    this.functionArn = new CfnOutput(scope, 'FunctionArn', {
      exportName: `${exportName}Arn`,
      value: fn.functionArn,
    }).exportName as string;
  }

  static import(scope: Construct, id: string, exportName: string): IFunction {
    const fnArn = Fn.importValue(`${exportName}Arn`);

    return Function.fromFunctionArn(scope, id, fnArn);
  }
}

const expandSubnetIds = (names: string[] | undefined, value: string, aZs: number): string[] => {
  if (names && names.length) {
    return expandCfnArray(Fn.split(',', Fn.importValue(value)), names.length * aZs);
  }

  return [];
};

const expandCfnArray = (val: string[], n: number): string[] => {
  const res = [];
  for (let i = 0; i < n; i++) {
    res[i] = Fn.select(i, val);
  }
  return res;
};
