import { Construct, IConstruct, ITaggable, TagManager } from '@aws-cdk/core';
import { CfnSubnetGroup, CfnReplicationGroup, CfnReplicationGroupProps } from '@aws-cdk/aws-elasticache';
import { IVpc, ISubnet, IConnectable, SecurityGroup, Port, SubnetSelection } from '@aws-cdk/aws-ec2';

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
 * Refer https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticache-replicationgroup.html for more
 * details on each prop
 *
 * @default
 *  replicationGroupDescription: 'Redis cluster', // Mandatory Description
 *  atRestEncryptionEnabled: true, // Enable encryption at rest
 *  cacheNodeType: 'cache.t3.micro', // Instance type
 *  numCacheClusters: 1, // The number of clusters this replication group initially has
 *  transitEncryptionEnabled: true, // Enable transit encryption
 *  automaticFailoverEnabled: false, // Specifies whether a read-only replica is automatically promoted to read/write primary if the existing primary fails.
 */
export interface RedisProps extends Partial<CfnReplicationGroupProps> {
  /**
   * VPC to launch Redis cluster in
   */
  vpc: IVpc;
  /**
   * List of Subnets to launch Redis cluster in
   */
  subnets: SubnetSelection[];
  /**
   * Allowed ingress connections to Redis SecurityGroup
   *
   * @default - Allowed from anywhere.
   */
  connectionsAllowedFrom?: IConnectable;

  /**
   * Enable sensible defaults for basic high availability
   *
   * @default - false.
   */
  highAvailabilityMode?: boolean;
}

export class Redis extends Construct implements ITaggable {
  /**
   * Taggable Resource
   */
  readonly tags: TagManager;
  /**
   * Subnet Group created by construct using Subnets provided in props
   */
  readonly cacheSubnetGroup: CfnSubnetGroup;
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroup?: SecurityGroup;
  /**
   * Actual Redis Cluster
   */
  readonly redisReplicationGroup: CfnReplicationGroup;

  /**
   * Redis URI `redis://${endpoint}:${port}
   */
  get uri(): string {
    return `redis://${this.redisReplicationGroup.attrPrimaryEndPointAddress}:${this.redisReplicationGroup.attrPrimaryEndPointPort}`;
  }

  constructor(scope: Construct, id: string, props: RedisProps) {
    super(scope, id);

    const { vpc, subnets, connectionsAllowedFrom, port = 6379, securityGroupIds, highAvailabilityMode = false } = props;

    const subnetSelections = subnets
      .map(selection => vpc.selectSubnets(selection))
      .reduce<ISubnet[]>((subnets, selection) => {
        subnets.push(...selection.subnets.filter(x => !subnets.includes(x)));
        return subnets;
      }, []);

    // Create CacheSubnet group
    this.cacheSubnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: `Redis Subnet group for ${this.node.path}`,
      subnetIds: subnetSelections.map(x => x.subnetId),
    });

    // Create SecurityGroup
    if (!securityGroupIds) {
      this.redisSecurityGroup = new SecurityGroup(this, 'RedisSecurityGroup', {
        vpc: vpc,
        description: `Redis Security Group for ${this.node.path}`,
        allowAllOutbound: false,
      });

      // Check if Security Ingress is required to be locked down
      if (connectionsAllowedFrom == undefined) {
        this.redisSecurityGroup.connections.allowFromAnyIpv4(Port.tcp(port));
      } else {
        this.redisSecurityGroup.connections.allowFrom(connectionsAllowedFrom, Port.tcp(port));
      }
    }

    const modeProps: Partial<CfnReplicationGroupProps> = highAvailabilityMode
      ? {
          numNodeGroups: 1,
          numCacheClusters: Math.max(2, vpc.availabilityZones.length),
          multiAzEnabled: true,
          automaticFailoverEnabled: true,
        }
      : {
          numNodeGroups: 1,
          numCacheClusters: 1,
          multiAzEnabled: false,
          automaticFailoverEnabled: false,
        };

    // Create the actual redis cluster
    this.redisReplicationGroup = new CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: `Redis cluster for ${this.node.path}`,
      cacheNodeType: 'cache.t3.micro',
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      ...modeProps,
      ...props,
      cacheSubnetGroupName: this.cacheSubnetGroup.ref,
      securityGroupIds: this.redisSecurityGroup ? [this.redisSecurityGroup.securityGroupId] : securityGroupIds,
      engine: 'redis',
    });

    this.tags = this.redisReplicationGroup.tags;
  }
}
