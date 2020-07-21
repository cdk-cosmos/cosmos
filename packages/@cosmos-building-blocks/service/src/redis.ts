import { Construct, IConstruct } from '@aws-cdk/core';
import { CfnSubnetGroup, CfnReplicationGroup, CfnReplicationGroupProps } from '@aws-cdk/aws-elasticache';
import { SecurityGroup, Port, IVpc, Connections } from '@aws-cdk/aws-ec2';

export interface IRedis extends IConstruct {
  /**
   * Subnet Group created by construct using provided Subnets
   */
  readonly cacheSubnetGroup: CfnSubnetGroup;
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroup: SecurityGroup;
  /**
   * Actual Redis Cluster
   */
  readonly redisReplicationGroup: CfnReplicationGroup;
}

export interface RedisProps {
  /**
   * VPC to launch Redis cluster in
   */
  vpc: IVpc;
  /**
   * Allowed ingress connections to Redis SecurityGroup
   *
   * @default - Allowed from anywhere.
   */
  connectionsAllowedFrom?: Connections;
  /**
   * List of Subnets to launch Redis cluster in
   */
  subnetIds: string[];
  /**
   * Redis Cluster props. If not provided, following defaults will be used:
   *
   * @default  
   * redisProps = {
      replicationGroupDescription: 'Redis cluster',
      atRestEncryptionEnabled: true,
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      cacheSubnetGroupName: `Generated`,
      securityGroupIds: `Generated`,
      numCacheClusters: 1,
      transitEncryptionEnabled: true,
      automaticFailoverEnabled: false,
    }
   */
  redisProps?: CfnReplicationGroupProps;
}

export class Redis extends Construct {
  /**
   * Subnet Group created by construct using Subnets provided in props
   */
  readonly cacheSubnetGroup: CfnSubnetGroup;
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroup: SecurityGroup;
  /**
   * Actual Redis Cluster
   */
  readonly redisReplicationGroup: CfnReplicationGroup;

  constructor(scope: Construct, id: string, props: RedisProps) {
    super(scope, id);

    const { vpc, subnetIds, connectionsAllowedFrom } = props;

    this.cacheSubnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds,
    });

    this.redisSecurityGroup = new SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: false,
    });

    if (connectionsAllowedFrom == undefined) {
      this.redisSecurityGroup.connections.allowFromAnyIpv4(Port.tcp(6379));
    } else {
      this.redisSecurityGroup.connections.allowFrom(connectionsAllowedFrom, Port.tcp(6379));
    }

    const redisProps = {
      replicationGroupDescription: 'Redis cluster',
      atRestEncryptionEnabled: true,
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      cacheSubnetGroupName: this.cacheSubnetGroup.ref,
      securityGroupIds: [this.redisSecurityGroup.securityGroupId.toString()],
      numCacheClusters: 1,
      transitEncryptionEnabled: true,
      automaticFailoverEnabled: false,
      ...props.redisProps,
    };

    this.redisReplicationGroup = new CfnReplicationGroup(this, 'Redis', redisProps);
  }
}
