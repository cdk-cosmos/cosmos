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
  static export(namespace: string, zone: IHostedZone & Construct) {
    const scope = zone.node.scope as Construct;
    const exportName = `${namespace}${zone.node.id}`;

    new CfnOutput(scope, 'ZoneId', {
      exportName: `${exportName}Id`,
      value: zone.hostedZoneId,
    });

    new CfnOutput(scope, 'ZoneName', {
      exportName: `${exportName}Name`,
      value: zone.zoneName,
    });
  }

  static import(scope: Construct, namespace: string, zone: string) {
    const exportName = `${namespace}${zone}`;
    const hostedZoneId = Fn.importValue(`${exportName}Id`);
    const zoneName = Fn.importValue(`${exportName}Name`);

    return HostedZone.fromHostedZoneAttributes(scope, zone, {
      hostedZoneId,
      zoneName,
    });
  }
}

export class RemoteVpc {
  static export(namespace: string, vpc: IVpc & Construct) {
    const scope = vpc.node.scope as Construct;
    const exportName = `${namespace}${vpc.node.id}`;

    new CfnOutput(scope, 'VpcId', {
      exportName: `${exportName}Id`,
      value: vpc.vpcId,
    });

    new CfnOutput(scope, 'VpcAZs', {
      exportName: `${exportName}AZs`,
      value: vpc.availabilityZones.join(','),
    });

    if (vpc.isolatedSubnets.length) {
      new CfnOutput(scope, 'VpcIsolatedSubnets', {
        exportName: `${exportName}IsolatedSubnetIds`,
        value: vpc.isolatedSubnets.map(s => s.subnetId).join(','),
      });
      new CfnOutput(scope, 'VpcIsolatedSubnetRouteTables', {
        exportName: `${exportName}IsolatedSubnetRouteTableIds`,
        value: vpc.isolatedSubnets.map(s => s.routeTable.routeTableId).join(','),
      });
    }

    if (vpc.privateSubnets.length) {
      new CfnOutput(scope, 'VpcPrivateSubnets', {
        exportName: `${exportName}PrivateSubnetIds`,
        value: vpc.privateSubnets.map(s => s.subnetId).join(','),
      });
      new CfnOutput(scope, 'VpcPrivateSubnetRouteTables', {
        exportName: `${exportName}PrivateSubnetRouteTableIds`,
        value: vpc.privateSubnets.map(s => s.routeTable.routeTableId).join(','),
      });
    }

    if (vpc.publicSubnets.length) {
      new CfnOutput(scope, 'VpcPublicSubnets', {
        exportName: `${exportName}PublicSubnetIds`,
        value: vpc.publicSubnets.map(s => s.subnetId).join(','),
      });
      new CfnOutput(scope, 'VpcPublicSubnetRouteTables', {
        exportName: `${exportName}PublicSubnetRouteTableIds`,
        value: vpc.publicSubnets.map(s => s.routeTable.routeTableId).join(','),
      });
    }
  }

  static import(
    scope: Construct,
    namespace: string,
    vpc: string,
    { hasIsolated = false, hasPrivate = false, hasPublic = false },
  ) {
    const exportName = `${namespace}${vpc}`;

    const vpcId = Fn.importValue(`${exportName}Id`);
    const availabilityZones = Fn.split(',', Fn.importValue(`${exportName}AZs`));

    const isolatedSubnetIds = Fn.split(',', Fn.importValue(`${exportName}IsolatedSubnetIds`));
    const isolatedSubnetRouteTableIds = Fn.split(',', Fn.importValue(`${exportName}IsolatedSubnetRouteTableIds`));

    const privateSubnetIds = Fn.split(',', Fn.importValue(`${exportName}PrivateSubnetIds`));
    const privateSubnetRouteTableIds = Fn.split(',', Fn.importValue(`${exportName}PrivateSubnetRouteTableIds`));

    const publicSubnetIds = Fn.split(',', Fn.importValue(`${exportName}PublicSubnetIds`));
    const publicSubnetRouteTableIds = Fn.split(',', Fn.importValue(`${exportName}PublicSubnetRouteTableIds`));

    return Vpc.fromVpcAttributes(scope, vpc, {
      vpcId,
      availabilityZones,
      isolatedSubnetIds: hasIsolated ? isolatedSubnetIds : [],
      isolatedSubnetRouteTableIds: hasIsolated ? isolatedSubnetRouteTableIds : [],
      privateSubnetIds: hasPrivate ? privateSubnetIds : [],
      privateSubnetRouteTableIds: hasPrivate ? privateSubnetRouteTableIds : [],
      publicSubnetIds: hasPrivate ? publicSubnetIds : [],
      publicSubnetRouteTableIds: hasPublic ? publicSubnetIds : [],
    });
  }
}

export class RemoteCluster {
  static exportName(namespace: string, zone: string) {
    return `${namespace}${zone}`;
  }

  static export(namespace: string, cluster: ICluster & Construct) {
    const scope = cluster.node.scope as Construct;
    const exportName = `${namespace}${cluster.node.id}`;

    new CfnOutput(scope, 'ClusterName', {
      exportName: `${exportName}Name`,
      value: cluster.clusterName,
    });

    new CfnOutput(scope, 'ClusterSecurityGroup', {
      exportName: `${exportName}SecurityGroup`,
      value: cluster.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, namespace: string, cluster: string, vpc: IVpc) {
    const exportName = `${namespace}${cluster}`;
    const clusterName = Fn.importValue(`${exportName}Name`);
    const securityGroups = [
      SecurityGroup.fromSecurityGroupId(scope, `${cluster}SecurityGroup`, Fn.importValue(`${exportName}SecurityGroup`)),
    ];

    return Cluster.fromClusterAttributes(scope, cluster, {
      clusterName,
      vpc,
      securityGroups,
    });
  }
}

export class RemoteAlb {
  static export(namespace: string, alb: IApplicationLoadBalancer & Construct) {
    const scope = alb.node.scope as Construct;
    const exportName = `${namespace}${alb.node.id}`;

    new CfnOutput(scope, 'AlbArn', {
      exportName: `${exportName}Arn`,
      value: alb.loadBalancerArn,
    });

    new CfnOutput(scope, 'AlbSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: alb.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, namespace: string, alb: string) {
    const exportName = `${namespace}${alb}`;
    const loadBalancerArn = Fn.importValue(`${exportName}Arn`);
    const securityGroupId = Fn.importValue(`${exportName}SecurityGroupId`);

    return ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(scope, alb, {
      loadBalancerArn,
      securityGroupId,
    });
  }
}

export class RemoteApplicationListener {
  static export(namespace: string, listener: IApplicationListener & Construct) {
    const scope = listener.node.scope as Construct;
    const exportName = `${namespace}${listener.node.id}`;

    new CfnOutput(scope, 'AlArn', {
      exportName: `${exportName}Arn`,
      value: listener.listenerArn,
    });

    new CfnOutput(scope, 'AlSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: listener.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, namespace: string, listener: string) {
    const exportName = `${namespace}${listener}`;
    const listenerArn = Fn.importValue(`${exportName}Arn`);
    const securityGroupId = Fn.importValue(`${exportName}SecurityGroupId`);
    const securityGroup = SecurityGroup.fromSecurityGroupId(scope, `${listener}SG`, securityGroupId);

    return ApplicationListener.fromApplicationListenerAttributes(scope, listener, {
      listenerArn,
      // securityGroupId,
      securityGroup,
    });
  }
}

export class RemoteCodeRepo {
  static export(namespace: string, repo: ICodeRepository & Construct) {
    const scope = repo.node.scope as Construct;
    const exportName = `${namespace}${repo.node.id}`;

    new CfnOutput(scope, 'RepoName', {
      exportName: `${exportName}Name`,
      value: repo.repositoryName,
    });
  }

  static import(scope: Construct, namespace: string, repo: string) {
    const exportName = `${namespace}${repo}`;
    const repoName = Fn.importValue(`${exportName}Name`);

    return CodeRepository.fromRepositoryName(scope, repo, repoName);
  }
}

export class RemoteBuildProject {
  static export(namespace: string, project: IProject & Construct) {
    const scope = project.node.scope as Construct;
    const exportName = `${namespace}${project.node.id}`;

    new CfnOutput(scope, 'BuildProjectName', {
      exportName: `${exportName}Name`,
      value: project.projectName,
    });
  }

  static import(scope: Construct, namespace: string, project: string) {
    const exportName = `${namespace}${project}`;
    const repoName = Fn.importValue(`${exportName}Name`);

    return Project.fromProjectName(scope, project, repoName);
  }
}
