import { Construct } from '@aws-cdk/core';
import { SolarSystemCoreImport } from '../../solar-system/solar-system-core-import';
import { BaseFeatureConstruct, BaseFeatureConstructProps } from '../../components/base';
import { IRedisFeature } from './redis-feature-stack';
import { RemoteRedis } from '../../components/remote';
import { IRedis } from '@cosmos-building-blocks/service';

export interface RedisFeatureImportProps extends BaseFeatureConstructProps {
  exportName: string;
}

export class RedisFeatureImport extends BaseFeatureConstruct implements IRedisFeature {
  readonly redis: IRedis;

  constructor(scope: Construct, id: string, props: RedisFeatureImportProps) {
    super(scope, id, props);

    const { exportName } = props;

    this.redis = RemoteRedis.import(this, 'Redis', exportName);
  }
}

declare module '../../solar-system/solar-system-core-import' {
  interface SolarSystemCoreImport {
    addRedis(id: string): RedisFeatureImport;
  }
}

SolarSystemCoreImport.prototype.addRedis = function (id): RedisFeatureImport {
  return new RedisFeatureImport(this, id, {
    exportName: this.singletonId(id),
  });
};
