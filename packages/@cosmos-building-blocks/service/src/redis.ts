import { Construct, IConstruct } from '@aws-cdk/core';
import { CfnSubnetGroup, CfnReplicationGroup, CfnReplicationGroupProps } from '@aws-cdk/aws-elasticache';
import { SecurityGroup, Port, IVpc, Connections, SubnetSelection, ISubnet } from '@aws-cdk/aws-ec2';

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

/**
 * Redis Cluster props. for the optional props not provided, following defaults will be used:
 *
 * @default
 *  replicationGroupDescription: 'Redis cluster',
 *  atRestEncryptionEnabled: true,
 *  cacheNodeType: 'cache.t3.micro',
 *  engine: 'redis',
 *  cacheSubnetGroupName: `Generated`,
 *  securityGroupIds: `Generated`,
 *  numCacheClusters: 1,
 *  transitEncryptionEnabled: true,
 *  automaticFailoverEnabled: false,
 */
export interface RedisProps extends Partial<CfnReplicationGroupProps> {
  /**
   * VPC to launch Redis cluster in
   */
  vpc: IVpc;
  /**
   * List of Subnets to launch Redis cluster in
   */
  subnetIds: SubnetSelection[];
  /**
   * Allowed ingress connections to Redis SecurityGroup
   *
   * @default - Allowed from anywhere.
   */
  connectionsAllowedFrom?: Connections;
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
    const subnets = subnetIds
      .map(selection => vpc.selectSubnets(selection))
      .reduce<ISubnet[]>((subnets, selection) => {
        subnets.push(...selection.subnets.filter(x => !subnets.includes(x)));
        return subnets;
      }, []);

    // Create CacheSubnet group
    this.cacheSubnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: subnets.map(x => x.subnetId),
    });

    // Create SecurityGroup
    this.redisSecurityGroup = new SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: false,
    });

    // Check if Security Ingress is required to be locked down
    if (connectionsAllowedFrom == undefined) {
      this.redisSecurityGroup.connections.allowFromAnyIpv4(Port.tcp(6379));
    } else {
      this.redisSecurityGroup.connections.allowFrom(connectionsAllowedFrom, Port.tcp(6379));
    }

    // Create the actual redis cluster
    this.redisReplicationGroup = new CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: 'Redis cluster',
      atRestEncryptionEnabled: true,
      cacheNodeType: 'cache.t3.micro',
      cacheSubnetGroupName: this.cacheSubnetGroup.ref,
      securityGroupIds: [this.redisSecurityGroup.securityGroupId.toString()],
      numCacheClusters: 1,
      transitEncryptionEnabled: true,
      automaticFailoverEnabled: false,
      ...props,
      engine: 'redis',
    });
  }
}
