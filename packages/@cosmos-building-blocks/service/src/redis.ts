import { Construct, IConstruct, Stack } from '@aws-cdk/core';
import { CfnSubnetGroup, CfnReplicationGroup, CfnReplicationGroupProps } from '@aws-cdk/aws-elasticache';
import {
  IVpc,
  ISubnet,
  IConnectable,
  ISecurityGroup,
  SecurityGroup,
  Port,
  SubnetSelection,
  Connections,
  Peer,
} from '@aws-cdk/aws-ec2';

export interface IRedis extends IConstruct {
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroups?: ISecurityGroup[];
  /**
   * Redis Protocol of the Primary Address connection (redis[s])
   */
  readonly redisProtocol: string;
  /**
   * Redis endpoint of the Primary Address
   */
  readonly redisEndpoint: string;
  /**
   * Redis port of the Primary Address
   */
  readonly redisPort: string;
  /**
   * Redis URI `{protocol}://{endpoint}:{port} of the Primary Address
   */
  readonly redisUri: string;
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
export interface RedisProps extends Omit<Partial<CfnReplicationGroupProps>, 'securityGroupIds'> {
  /**
   * VPC to launch Redis cluster in
   */
  readonly vpc: IVpc;
  /**
   * List of Subnets to launch Redis cluster in
   */
  readonly subnets: SubnetSelection[];
  /**
   * `AWS::ElastiCache::ReplicationGroup.SecurityGroupIds`.
   *
   * @default - Create a new Security Group for redis.
   */
  readonly securityGroups?: ISecurityGroup[];
  /**
   * Allowed ingress connections to Redis SecurityGroup
   *
   * @default - Allowed from anywhere.
   */
  readonly connectionsAllowedFrom?: string | IConnectable;
  /**
   * Enable sensible defaults for basic high availability
   *
   * @default - false.
   */
  readonly highAvailabilityMode?: boolean;
}

export class Redis extends Construct implements IRedis {
  /**
   * Actual Redis Cluster
   */
  readonly redisReplicationGroup: CfnReplicationGroup;
  /**
   * Subnet Group created by construct using Subnets provided in props
   */
  readonly cacheSubnetGroup: CfnSubnetGroup;
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroups: ISecurityGroup[];
  /**
   * Redis Protocol of the Primary Address connection (redis[s])
   */
  readonly redisProtocol: string;
  /**
   * Redis endpoint of the Primary Address
   */
  readonly redisEndpoint: string;
  /**
   * Redis port of the Primary Address
   */
  readonly redisPort: string;
  /**
   * Redis URI `{protocol}://{endpoint}:{port} of the Primary Address
   */
  readonly redisUri: string;

  constructor(scope: Construct, id: string, props: RedisProps) {
    super(scope, id);

    const { vpc, subnets, connectionsAllowedFrom, port = 6379, securityGroups, highAvailabilityMode = false } = props;

    const subnetSelections = subnets
      .map((selection) => vpc.selectSubnets(selection))
      .reduce<ISubnet[]>((subnets, selection) => {
        subnets.push(...selection.subnets.filter((x) => !subnets.includes(x)));
        return subnets;
      }, []);

    // Create CacheSubnet group
    this.cacheSubnetGroup = new CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: `Redis Subnet group for ${this.node.path}`,
      subnetIds: subnetSelections.map((x) => x.subnetId),
    });

    if (securityGroups && securityGroups.length) {
      this.redisSecurityGroups = securityGroups;
    } else {
      // Create SecurityGroup
      this.redisSecurityGroups = [
        new SecurityGroup(this, 'RedisSecurityGroup', {
          vpc: vpc,
          description: `Redis Security Group for ${this.node.path}`,
          allowAllOutbound: false,
        }),
      ];

      // Check if Security Ingress is required to be locked down
      if (connectionsAllowedFrom == undefined) {
        this.redisSecurityGroups[0].connections.allowFromAnyIpv4(Port.tcp(port));
      } else {
        this.redisSecurityGroups[0].connections.allowFrom(
          typeof connectionsAllowedFrom === 'string'
            ? new Connections({
                peer: Peer.ipv4(connectionsAllowedFrom),
              })
            : connectionsAllowedFrom,
          Port.tcp(port)
        );
      }
    }

    const modeProps: Partial<CfnReplicationGroupProps> = highAvailabilityMode
      ? {
          numNodeGroups: 1,
          replicasPerNodeGroup: Math.max(1, vpc.availabilityZones.length - 1),
          multiAzEnabled: true,
          automaticFailoverEnabled: true,
        }
      : {
          numNodeGroups: 1,
          replicasPerNodeGroup: 0,
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
      securityGroupIds: this.redisSecurityGroups.map((x) => x.securityGroupId),
      engine: 'redis',
    });

    this.redisProtocol = Stack.of(this).resolve(this.redisReplicationGroup.transitEncryptionEnabled)
      ? 'rediss'
      : 'redis';
    this.redisEndpoint = this.redisReplicationGroup.attrPrimaryEndPointAddress;
    this.redisPort = this.redisReplicationGroup.attrPrimaryEndPointPort;
    this.redisUri = `${this.redisProtocol}://${this.redisEndpoint}:${this.redisPort}`;
  }

  static fromRedisAttributes(scope: Construct, id: string, attrs: RedisAttributes): IRedis {
    return new ImportedRedis(scope, id, attrs);
  }
}

export interface RedisAttributes {
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroups?: ISecurityGroup[];
  /**
   * Redis Protocol of the Primary Address connection (redis[s])
   */
  readonly redisProtocol: string;
  /**
   * Redis endpoint of the Primary Address
   */
  readonly redisEndpoint: string;
  /**
   * Redis port of the Primary Address
   */
  readonly redisPort: string;
}

class ImportedRedis extends Construct implements IRedis {
  /**
   * Security Group assigned to Redis Cluster
   */
  readonly redisSecurityGroups?: ISecurityGroup[];
  /**
   * Redis Protocol of the Primary Address connection (redis[s])
   */
  readonly redisProtocol: string;
  /**
   * Redis endpoint of the Primary Address
   */
  readonly redisEndpoint: string;
  /**
   * Redis port of the Primary Address
   */
  readonly redisPort: string;
  /**
   * Redis URI `{protocol}://{endpoint}:{port} of the Primary Address
   */
  readonly redisUri: string;

  constructor(scope: Construct, id: string, props: RedisAttributes) {
    super(scope, id);
    const { redisSecurityGroups, redisEndpoint, redisPort, redisProtocol } = props;

    this.redisSecurityGroups = redisSecurityGroups;
    this.redisProtocol = redisProtocol;
    this.redisEndpoint = redisEndpoint;
    this.redisPort = redisPort;
    this.redisUri = `${this.redisProtocol}://${this.redisEndpoint}:${this.redisPort}`;
  }
}
