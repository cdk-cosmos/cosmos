import { SynthUtils, expect as cdkExpect, haveResourceLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { Redis } from '../src/index';
import { Vpc, SubnetType, Instance, InstanceClass, InstanceType, InstanceSize, MachineImage } from '@aws-cdk/aws-ec2';
import '@aws-cdk/assert/jest';

test('Should match snapshot', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'aws-redis');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
      {
        name: 'Redis',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 28,
      },
    ],
  });
  const ec2 = new Instance(stack, 'Ec2', {
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.LARGE),
    machineImage: MachineImage.latestAmazonLinux(),
    vpc,
  });
  // Redis cluster only allowing connections from ec2 in 'Redis' subnet
  new Redis(stack, 'Redis', {
    vpc,
    connectionsAllowedFrom: ec2.connections,
    subnetIds: [{ subnetGroupName: 'Redis' }],
  });
  // Redis cluster allowing all connections in 'Redis' subnet
  new Redis(stack, 'RedisOpen', {
    vpc,
    subnetIds: [{ subnetGroupName: 'Redis' }],
  });

  // Redis cluster overwriting some of the default props
  new Redis(stack, 'RedisOverwrite', {
    vpc,
    subnetIds: [{ subnetGroupName: 'App' }],
    replicationGroupDescription: 'Redis cluster not encrypted',
    atRestEncryptionEnabled: false,
    cacheNodeType: 'cache.t3.medium',
    numCacheClusters: 3,
    transitEncryptionEnabled: false,
    automaticFailoverEnabled: true,
  });
  // THEN
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('Should be able to overwrite props', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'aws-redis');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
      {
        name: 'Redis',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 28,
      },
    ],
  });
  new Redis(stack, 'RedisTest2', {
    vpc,
    subnetIds: [{ subnetGroupName: 'App' }],
    atRestEncryptionEnabled: true,
    cacheNodeType: 'cache.t3.medium',
    numCacheClusters: 3,
    transitEncryptionEnabled: false,
    automaticFailoverEnabled: true,
    engine: 'memcached', // This should not create memcache engine and should overwrite to Redis
  });
  // THEN
  expect(stack).toHaveResource('AWS::ElastiCache::ReplicationGroup', { AtRestEncryptionEnabled: true });
  expect(stack).toHaveResource('AWS::ElastiCache::ReplicationGroup', { TransitEncryptionEnabled: false });
  expect(stack).toHaveResource('AWS::ElastiCache::ReplicationGroup', { NumCacheClusters: 3 });
  expect(stack).toHaveResource('AWS::ElastiCache::ReplicationGroup', { CacheNodeType: 'cache.t3.medium' });
  expect(stack).toHaveResource('AWS::ElastiCache::ReplicationGroup', { AutomaticFailoverEnabled: true });
  expect(stack).toHaveResource('AWS::ElastiCache::ReplicationGroup', { Engine: 'redis' }); // Engine should always be redis
});

test('Default Redis should have all default properties', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'redis-default');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
      {
        name: 'Redis',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 28,
      },
    ],
  });
  // Redis with only required props
  new Redis(stack, 'RedisTest3', {
    vpc,
    subnetIds: [{ subnetGroupName: 'Redis' }],
  });
  // THEN
  // Redis SG should allow connection from anywhere on port 6379
  cdkExpect(stack).to(
    haveResourceLike('AWS::EC2::SecurityGroup', {
      GroupDescription: 'redis-default/RedisTest3/RedisSecurityGroup',
      SecurityGroupIngress: [{ CidrIp: '0.0.0.0/0', ToPort: 6379 }],
    })
  );
  // Redis SubnetGroup should be created only in subnets provided in props
  cdkExpect(stack).to(
    haveResourceLike('AWS::ElastiCache::SubnetGroup', {
      SubnetIds: [
        {
          Ref: 'vpcRedisSubnet1Subnet3EE087E6',
        },
        {
          Ref: 'vpcRedisSubnet2SubnetFF7CC220',
        },
      ],
    })
  );
});
