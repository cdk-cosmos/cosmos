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
  static export(zone: IHostedZone & Construct, exportName: string, scope: Construct = zone): void {
    new CfnOutput(scope, 'ZoneId', {
      exportName: `${exportName}Id`,
      value: zone.hostedZoneId,
    });
    new CfnOutput(scope, 'ZoneName', {
      exportName: `${exportName}Name`,
      value: zone.zoneName,
    });
    if (!(zone instanceof PrivateHostedZone)) {
      if (zone.hostedZoneNameServers) {
        new CfnOutput(scope, 'ZoneNameServers', {
          exportName: `${exportName}NameServers`,
          value: Fn.join(',', zone.hostedZoneNameServers),
        });
      }
    }
  }

  static import(scope: Construct, id: string, exportName: string): IHostedZone {
    const hostedZoneId = Fn.importValue(`${exportName}Id`);
    const zoneName = Fn.importValue(`${exportName}Name`);

    return HostedZone.fromHostedZoneAttributes(scope, id, {
      hostedZoneId,
      zoneName,
    });
  }
}

export class RemoteVpcImportProps {
  aZs: number;
  isolatedSubnetNames?: string[];
  privateSubnetNames?: string[];
  publicSubnetNames?: string[];
}

export class RemoteVpc {
  static export(vpc: IVpc & Construct, exportName: string, scope: Construct = vpc): void {
    new CfnOutput(scope, 'VpcId', {
      exportName: `${exportName}Id`,
      value: vpc.vpcId,
    });
    new CfnOutput(scope, 'VpcCidrBlock', {
      exportName: `${exportName}CidrBlock`,
      value: vpc.vpcCidrBlock,
    });
    new CfnOutput(scope, 'VpcAZs', {
      exportName: `${exportName}AZs`,
      value: Fn.join(',', vpc.availabilityZones),
    });

    if (vpc.isolatedSubnets.length) {
      new CfnOutput(scope, 'VpcIsolatedSubnets', {
        exportName: `${exportName}IsolatedSubnetIds`,
        value: Fn.join(
          ',',
          vpc.isolatedSubnets.map(s => s.subnetId)
        ),
      });
      new CfnOutput(scope, 'VpcIsolatedSubnetRouteTables', {
        exportName: `${exportName}IsolatedSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.isolatedSubnets.map(s => s.routeTable.routeTableId)
        ),
      });
    }

    if (vpc.privateSubnets.length) {
      new CfnOutput(scope, 'VpcPrivateSubnets', {
        exportName: `${exportName}PrivateSubnetIds`,
        value: Fn.join(
          ',',
          vpc.privateSubnets.map(s => s.subnetId)
        ),
      });
      new CfnOutput(scope, 'VpcPrivateSubnetRouteTables', {
        exportName: `${exportName}PrivateSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.privateSubnets.map(s => s.routeTable.routeTableId)
        ),
      });
    }

    if (vpc.publicSubnets.length) {
      new CfnOutput(scope, 'VpcPublicSubnets', {
        exportName: `${exportName}PublicSubnetIds`,
        value: Fn.join(
          ',',
          vpc.publicSubnets.map(s => s.subnetId)
        ),
      });
      new CfnOutput(scope, 'VpcPublicSubnetRouteTables', {
        exportName: `${exportName}PublicSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.publicSubnets.map(s => s.routeTable.routeTableId)
        ),
      });
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
  static export(cluster: ICluster & Construct, exportName: string, scope: Construct = cluster): void {
    new CfnOutput(scope, 'ClusterName', {
      exportName: `${exportName}Name`,
      value: cluster.clusterName,
    });
    new CfnOutput(scope, 'ClusterSecurityGroup', {
      exportName: `${exportName}SecurityGroup`,
      value: cluster.connections.securityGroups[0].securityGroupId,
    });
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
  static export(alb: IApplicationLoadBalancer & Construct, exportName: string, scope: Construct = alb): void {
    new CfnOutput(scope, 'AlbArn', {
      exportName: `${exportName}Arn`,
      value: alb.loadBalancerArn,
    });
    new CfnOutput(scope, 'AlbSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: alb.connections.securityGroups[0].securityGroupId,
    });
    new CfnOutput(scope, 'AlbDnsName', {
      exportName: `${exportName}DnsName`,
      value: alb.loadBalancerDnsName,
    });
    new CfnOutput(scope, 'AlbDnsHostZoneId', {
      exportName: `${exportName}DnsHostZoneId`,
      value: alb.loadBalancerCanonicalHostedZoneId,
    });
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
  static export(listener: IApplicationListener & Construct, exportName: string, scope: Construct = listener): void {
    new CfnOutput(scope, 'AlArn', {
      exportName: `${exportName}Arn`,
      value: listener.listenerArn,
    });
    new CfnOutput(scope, 'AlSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: listener.connections.securityGroups[0].securityGroupId,
    });
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
      // securityGroupId,
      securityGroup,
    });
  }
}

export class RemoteCodeRepo {
  static export(repo: ICodeRepository & Construct, exportName: string, scope: Construct = repo): void {
    new CfnOutput(scope, 'RepoName', {
      exportName: `${exportName}Name`,
      value: repo.repositoryName,
    });
  }

  static import(scope: Construct, id: string, exportName: string): ICodeRepository {
    const repoName = Fn.importValue(`${exportName}Name`);

    return CodeRepository.fromRepositoryName(scope, id, repoName);
  }
}

export class RemoteBuildProject {
  static export(project: IProject & Construct, exportName: string, scope: Construct = project): void {
    new CfnOutput(scope, 'BuildProjectName', {
      exportName: `${exportName}Name`,
      value: project.projectName,
    });
  }

  static import(scope: Construct, id: string, exportName: string): IProject {
    const repoName = Fn.importValue(`${exportName}Name`);

    return Project.fromProjectName(scope, id, repoName);
  }
}

export class RemoteFunction {
  static export(fn: IFunction & Construct, exportName: string, scope: Construct = fn): void {
    new CfnOutput(scope, 'FunctionArn', {
      exportName: `${exportName}Arn`,
      value: fn.functionArn,
    });
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
