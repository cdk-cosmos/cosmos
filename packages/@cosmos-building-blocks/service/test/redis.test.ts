import '@aws-cdk/assert/jest';
import { SynthUtils, expect as cdkExpect, haveResourceLike } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Vpc, SubnetType, Instance, InstanceClass, InstanceType, InstanceSize, MachineImage } from '@aws-cdk/aws-ec2';
import { Redis } from '../src/index';

test('Should match snapshot', () => {
  //WHEN
  const app = new App();
  const stack = new Stack(app, 'aws-redis');
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
    subnets: [{ subnetGroupName: 'Redis' }],
  });
  new Redis(stack, 'RedisHa', {
    vpc,
    subnets: [{ subnetGroupName: 'Redis' }],
    highAvailabilityMode: true,
  });
  // Redis cluster allowing all connections in 'Redis' subnet
  new Redis(stack, 'RedisClosed', {
    vpc,
    subnets: [{ subnetGroupName: 'Redis' }],
    connectionsAllowedFrom: ec2.connections,
  });

  // Redis cluster overwriting some of the default props
  new Redis(stack, 'RedisOverwrite', {
    vpc,
    subnets: [{ subnetGroupName: 'App' }],
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
  const app = new App();
  const stack = new Stack(app, 'aws-redis');
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
    subnets: [{ subnetGroupName: 'App' }],
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
  const app = new App();
  const stack = new Stack(app, 'redis-default');
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
    subnets: [{ subnetGroupName: 'Redis' }],
  });
  // THEN
  // Redis SG should allow connection from anywhere on port 6379
  cdkExpect(stack).to(
    haveResourceLike('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Redis Security Group for redis-default/RedisTest3',
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
