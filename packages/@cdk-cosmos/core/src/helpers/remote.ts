import { Construct, CfnOutput, CfnOutputProps, Fn } from '@aws-cdk/core';
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

export interface OutputProps extends CfnOutputProps {
  exportName: string;
}

// TODO: Fix upstream
export class Output extends CfnOutput {
  readonly exportName: string;
  constructor(scope: Construct, id: string, props: OutputProps) {
    super(scope, id, props);
    this.exportName = props.exportName;
  }
}

export class RemoteZone {
  static export(zone: IHostedZone & Construct, exportName: string, scope: Construct = zone): void {
    new Output(scope, 'ZoneId', {
      exportName: `${exportName}Id`,
      value: zone.hostedZoneId,
    });
    new Output(scope, 'ZoneName', {
      exportName: `${exportName}Name`,
      value: zone.zoneName,
    });
    if (!(zone instanceof PrivateHostedZone)) {
      if (zone.hostedZoneNameServers) {
        new Output(scope, 'NameServers', {
          exportName: `${exportName}NameServers`,
          value: Fn.join(',', zone.hostedZoneNameServers),
        });
      }
    }
  }

  static import(scope: Construct, exportName: string): IHostedZone {
    const hostedZoneId = Fn.importValue(`${exportName}Id`);
    const zoneName = Fn.importValue(`${exportName}Name`);

    return HostedZone.fromHostedZoneAttributes(scope, exportName, {
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
    new Output(scope, 'VpcId', {
      exportName: `${exportName}Id`,
      value: vpc.vpcId,
    });
    new Output(scope, 'VpcAZs', {
      exportName: `${exportName}AZs`,
      value: Fn.join(',', vpc.availabilityZones),
    });

    if (vpc.isolatedSubnets.length) {
      new Output(scope, 'VpcIsolatedSubnets', {
        exportName: `${exportName}IsolatedSubnetIds`,
        value: Fn.join(
          ',',
          vpc.isolatedSubnets.map(s => s.subnetId)
        ),
      });
      new Output(scope, 'VpcIsolatedSubnetRouteTables', {
        exportName: `${exportName}IsolatedSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.isolatedSubnets.map(s => s.routeTable.routeTableId)
        ),
      });
    }

    if (vpc.privateSubnets.length) {
      new Output(scope, 'VpcPrivateSubnets', {
        exportName: `${exportName}PrivateSubnetIds`,
        value: Fn.join(
          ',',
          vpc.privateSubnets.map(s => s.subnetId)
        ),
      });
      new Output(scope, 'VpcPrivateSubnetRouteTables', {
        exportName: `${exportName}PrivateSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.privateSubnets.map(s => s.routeTable.routeTableId)
        ),
      });
    }

    if (vpc.publicSubnets.length) {
      new Output(scope, 'VpcPublicSubnets', {
        exportName: `${exportName}PublicSubnetIds`,
        value: Fn.join(
          ',',
          vpc.publicSubnets.map(s => s.subnetId)
        ),
      });
      new Output(scope, 'VpcPublicSubnetRouteTables', {
        exportName: `${exportName}PublicSubnetRouteTableIds`,
        value: Fn.join(
          ',',
          vpc.publicSubnets.map(s => s.routeTable.routeTableId)
        ),
      });
    }
  }

  static import(scope: Construct, exportName: string, props: RemoteVpcImportProps): IVpc {
    const { aZs, isolatedSubnetNames, privateSubnetNames, publicSubnetNames } = props;

    const vpcId = Fn.importValue(`${exportName}Id`);
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

    return Vpc.fromVpcAttributes(scope, exportName, {
      vpcId,
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
    new Output(scope, 'ClusterName', {
      exportName: `${exportName}Name`,
      value: cluster.clusterName,
    });
    new Output(scope, 'ClusterSecurityGroup', {
      exportName: `${exportName}SecurityGroup`,
      value: cluster.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, exportName: string, vpc: IVpc): ICluster {
    const clusterName = Fn.importValue(`${exportName}Name`);
    const securityGroups = [
      SecurityGroup.fromSecurityGroupId(
        scope,
        `${exportName}SecurityGroup`,
        Fn.importValue(`${exportName}SecurityGroup`)
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
  static export(alb: IApplicationLoadBalancer & Construct, exportName: string, scope: Construct = alb): void {
    new Output(scope, 'AlbArn', {
      exportName: `${exportName}Arn`,
      value: alb.loadBalancerArn,
    });
    new Output(scope, 'AlbSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: alb.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, exportName: string): IApplicationLoadBalancer {
    const loadBalancerArn = Fn.importValue(`${exportName}Arn`);
    const securityGroupId = Fn.importValue(`${exportName}SecurityGroupId`);

    return ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(scope, exportName, {
      loadBalancerArn,
      securityGroupId,
    });
  }
}

export class RemoteApplicationListener {
  static export(listener: IApplicationListener & Construct, exportName: string, scope: Construct = listener): void {
    new Output(scope, 'AlArn', {
      exportName: `${exportName}Arn`,
      value: listener.listenerArn,
    });
    new Output(scope, 'AlSecurityGroupId', {
      exportName: `${exportName}SecurityGroupId`,
      value: listener.connections.securityGroups[0].securityGroupId,
    });
  }

  static import(scope: Construct, exportName: string): IApplicationListener {
    const listenerArn = Fn.importValue(`${exportName}Arn`);
    const securityGroup = SecurityGroup.fromSecurityGroupId(
      scope,
      `${exportName}SecurityGroup`,
      Fn.importValue(`${exportName}SecurityGroupId`)
    );

    return ApplicationListener.fromApplicationListenerAttributes(scope, exportName, {
      listenerArn,
      // securityGroupId,
      securityGroup,
    });
  }
}

export class RemoteCodeRepo {
  static export(repo: ICodeRepository & Construct, exportName: string, scope: Construct = repo): void {
    new Output(scope, 'RepoName', {
      exportName: `${exportName}Name`,
      value: repo.repositoryName,
    });
  }

  static import(scope: Construct, exportName: string): ICodeRepository {
    const repoName = Fn.importValue(`${exportName}Name`);

    return CodeRepository.fromRepositoryName(scope, exportName, repoName);
  }
}

export class RemoteBuildProject {
  static export(project: IProject & Construct, exportName: string, scope: Construct = project): void {
    new Output(scope, 'BuildProjectName', {
      exportName: `${exportName}Name`,
      value: project.projectName,
    });
  }

  static import(scope: Construct, exportName: string): IProject {
    const repoName = Fn.importValue(`${exportName}Name`);

    return Project.fromProjectName(scope, exportName, repoName);
  }
}

export class RemoteFunction {
  static export(fn: IFunction & Construct, exportName: string, scope: Construct = fn): void {
    new Output(scope, 'FunctionArn', {
      exportName: `${exportName}Arn`,
      value: fn.functionArn,
    });
  }

  static import(scope: Construct, exportName: string): IFunction {
    const fnArn = Fn.importValue(`${exportName}Arn`);

    return Function.fromFunctionArn(scope, exportName, fnArn);
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
