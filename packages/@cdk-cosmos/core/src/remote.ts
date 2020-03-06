import { Construct, CfnOutput, Fn } from '@aws-cdk/core';
import { IHostedZone, HostedZone } from '@aws-cdk/aws-route53';
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

export class RemoteZone {
  static export(zone: IHostedZone & Construct, exportName: string): void {
    new CfnOutput(zone, 'ZoneId', {
      exportName: `${exportName}-Id`,
      value: zone.hostedZoneId,
    });

    new CfnOutput(zone, 'ZoneName', {
      exportName: `${exportName}-Name`,
      value: zone.zoneName,
    });
  }

  static import(scope: Construct, exportName: string): IHostedZone {
    const hostedZoneId = Fn.importValue(`${exportName}-Id`);
    const zoneName = Fn.importValue(`${exportName}-Name`);

    return HostedZone.fromHostedZoneAttributes(scope, exportName, {
      hostedZoneId,
      zoneName,
    });
  }
}

export class RemoteVpc {
  static export(vpc: IVpc & Construct, exportName: string): void {
    new CfnOutput(vpc, 'VpcId', {
      exportName: `${exportName}-Id`,
      value: vpc.vpcId,
    });

    new CfnOutput(vpc, 'VpcAZs', {
      exportName: `${exportName}-AZs`,
      value: vpc.availabilityZones.join(','),
    });

    if (vpc.isolatedSubnets.length) {
      new CfnOutput(vpc, 'VpcIsolatedSubnets', {
        exportName: `${exportName}-IsolatedSubnetIds`,
        value: vpc.isolatedSubnets.map(s => s.subnetId).join(','),
      });
      new CfnOutput(vpc, 'VpcIsolatedSubnetRouteTables', {
        exportName: `${exportName}-IsolatedSubnetRouteTableIds`,
        value: vpc.isolatedSubnets.map(s => s.routeTable.routeTableId).join(','),
      });
    }

    if (vpc.privateSubnets.length) {
      new CfnOutput(vpc, 'VpcPrivateSubnets', {
        exportName: `${exportName}-PrivateSubnetIds`,
        value: vpc.privateSubnets.map(s => s.subnetId).join(','),
      });
      new CfnOutput(vpc, 'VpcPrivateSubnetRouteTables', {
        exportName: `${exportName}-PrivateSubnetRouteTableIds`,
        value: vpc.privateSubnets.map(s => s.routeTable.routeTableId).join(','),
      });
    }

    if (vpc.publicSubnets.length) {
      new CfnOutput(vpc, 'VpcPublicSubnets', {
        exportName: `${exportName}-PublicSubnetIds`,
        value: vpc.publicSubnets.map(s => s.subnetId).join(','),
      });
      new CfnOutput(vpc, 'VpcPublicSubnetRouteTables', {
        exportName: `${exportName}-PublicSubnetRouteTableIds`,
        value: vpc.publicSubnets.map(s => s.routeTable.routeTableId).join(','),
      });
    }
  }

  static import(
    scope: Construct,
    exportName: string,
    { hasIsolated = false, hasPrivate = false, hasPublic = false }
  ): IVpc {
    const vpcId = Fn.importValue(`${exportName}-Id`);
    const availabilityZones = Fn.split(',', Fn.importValue(`${exportName}-AZs`));

    const isolatedSubnetIds = Fn.split(',', Fn.importValue(`${exportName}-IsolatedSubnetIds`));
    const isolatedSubnetRouteTableIds = Fn.split(',', Fn.importValue(`${exportName}-IsolatedSubnetRouteTableIds`));

    const privateSubnetIds = Fn.split(',', Fn.importValue(`${exportName}-PrivateSubnetIds`));
    const privateSubnetRouteTableIds = Fn.split(',', Fn.importValue(`${exportName}-PrivateSubnetRouteTableIds`));

    const publicSubnetIds = Fn.split(',', Fn.importValue(`${exportName}-PublicSubnetIds`));
    const publicSubnetRouteTableIds = Fn.split(',', Fn.importValue(`${exportName}-PublicSubnetRouteTableIds`));

    return Vpc.fromVpcAttributes(scope, exportName, {
      vpcId,
      availabilityZones,
      isolatedSubnetIds: hasIsolated ? isolatedSubnetIds : [],
      isolatedSubnetRouteTableIds: hasIsolated ? isolatedSubnetRouteTableIds : [],
      privateSubnetIds: hasPrivate ? privateSubnetIds : [],
      privateSubnetRouteTableIds: hasPrivate ? privateSubnetRouteTableIds : [],
      publicSubnetIds: hasPrivate ? publicSubnetIds : [],
      publicSubnetRouteTableIds: hasPublic ? publicSubnetRouteTableIds : [],
    });
  }
}

export class RemoteCluster {
  static export(cluster: ICluster & Construct, exportName: string): void {
    new CfnOutput(cluster, 'ClusterName', {
      exportName: `${exportName}-Name`,
      value: cluster.clusterName,
    });

    new CfnOutput(cluster, 'ClusterSecurityGroup', {
      exportName: `${exportName}-SecurityGroup`,
      value: cluster.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, exportName: string, vpc: IVpc): ICluster {
    const clusterName = Fn.importValue(`${exportName}-Name`);
    const securityGroups = [
      SecurityGroup.fromSecurityGroupId(
        scope,
        `${exportName}SecurityGroup`,
        Fn.importValue(`${exportName}-SecurityGroup`)
      ),
    ];

    return Cluster.fromClusterAttributes(scope, exportName, {
      clusterName,
      vpc,
      securityGroups,
    });
  }
}

export class RemoteAlb {
  static export(alb: IApplicationLoadBalancer & Construct, exportName: string): void {
    new CfnOutput(alb, 'AlbArn', {
      exportName: `${exportName}-Arn`,
      value: alb.loadBalancerArn,
    });

    new CfnOutput(alb, 'AlbSecurityGroupId', {
      exportName: `${exportName}-SecurityGroupId`,
      value: alb.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, exportName: string): IApplicationLoadBalancer {
    const loadBalancerArn = Fn.importValue(`${exportName}-Arn`);
    const securityGroupId = Fn.importValue(`${exportName}-SecurityGroupId`);

    return ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(scope, exportName, {
      loadBalancerArn,
      securityGroupId,
    });
  }
}

export class RemoteApplicationListener {
  static export(listener: IApplicationListener & Construct, exportName: string): void {
    new CfnOutput(listener, 'AlArn', {
      exportName: `${exportName}-Arn`,
      value: listener.listenerArn,
    });

    new CfnOutput(listener, 'AlSecurityGroupId', {
      exportName: `${exportName}-SecurityGroupId`,
      value: listener.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, exportName: string): IApplicationListener {
    const listenerArn = Fn.importValue(`${exportName}-Arn`);
    const securityGroup = SecurityGroup.fromSecurityGroupId(
      scope,
      `${exportName}SecurityGroup`,
      Fn.importValue(`${exportName}-SecurityGroupId`)
    );

    return ApplicationListener.fromApplicationListenerAttributes(scope, exportName, {
      listenerArn,
      // securityGroupId,
      securityGroup,
    });
  }
}

export class RemoteCodeRepo {
  static export(repo: ICodeRepository & Construct, exportName: string): void {
    new CfnOutput(repo, 'RepoName', {
      exportName: `${exportName}-Name`,
      value: repo.repositoryName,
    });
  }

  static import(scope: Construct, exportName: string): ICodeRepository {
    const repoName = Fn.importValue(`${exportName}-Name`);

    return CodeRepository.fromRepositoryName(scope, exportName, repoName);
  }
}

export class RemoteBuildProject {
  static export(project: IProject & Construct, exportName: string): void {
    new CfnOutput(project, 'BuildProjectName', {
      exportName: `${exportName}-Name`,
      value: project.projectName,
    });
  }

  static import(scope: Construct, exportName: string): IProject {
    const repoName = Fn.importValue(`${exportName}-Name`);

    return Project.fromProjectName(scope, exportName, repoName);
  }
}
