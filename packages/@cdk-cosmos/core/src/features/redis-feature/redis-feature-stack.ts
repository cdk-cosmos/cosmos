import { Construct } from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import { SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { SolarSystemExtensionStack } from '../../solar-system/solar-system-extension-stack';
import { Redis } from '@cosmos-building-blocks/service';
import { IRedis, RedisProps } from '@cosmos-building-blocks/service/lib/redis';
import { BaseFeatureStack, BaseFeatureStackProps } from '../../components/base';
import { RemoteRedis } from '../../components/remote';

export interface IRedisFeature extends Construct {
  readonly redis: IRedis;
}

export interface RedisFeatureStackProps extends BaseFeatureStackProps, Partial<RedisProps> {
  /**
   * Vpc that the redis should be attached to.
   */
  readonly vpc: IVpc;
  /**
   * Export name for the Redis
   */
  readonly exportName: string;
}

export class RedisFeatureStack extends BaseFeatureStack implements IRedisFeature {
  readonly redis: Redis;

  constructor(scope: Construct, id: string, props: RedisFeatureStackProps) {
    super(scope, id, {
      description: 'Add Redis Features to the SolarSystem',
      ...props,
    });

    const { vpc, exportName } = props;

    this.redis = new Redis(this, 'Redis', {
      subnets: [{ subnetGroupName: 'App' }],
      ...props,
      vpc,
    });

    new RemoteRedis(this.redis, exportName);
  }
}

// ---- Extension Methods ----

declare module '../../solar-system/solar-system-core-stack' {
  interface SolarSystemCoreStack {
    addRedis(id: string, props?: Partial<RedisFeatureStackProps>): RedisFeatureStack;
  }
}

declare module '../../solar-system/solar-system-extension-stack' {
  export interface SolarSystemExtensionStack {
    addRedis(id: string, props?: Partial<RedisFeatureStackProps>): RedisFeatureStack;
  }
}

SolarSystemCoreStack.prototype.addRedis = function (id, props): RedisFeatureStack {
  return new RedisFeatureStack(this, id, {
    ...props,
    vpc: this.vpc,
    exportName: this.singletonId(id),
  });
};

SolarSystemExtensionStack.prototype.addRedis = function (id, props): RedisFeatureStack {
  return new RedisFeatureStack(this, id, {
    ...props,
    vpc: this.portal.vpc,
    exportName: this.nodeId(id),
  });
};
