import { Construct } from '@aws-cdk/core';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { ISolarSystemCore } from '../../solar-system/solar-system-core-stack';
import { SolarSystemCoreImport } from '../../solar-system/solar-system-core-import';
import { IEcsFeatureCore } from './ecs-feature-core-stack';
import { BaseFeatureConstruct, BaseFeatureConstructProps } from '../../components/base';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from '../../components/remote';

export interface EcsFeatureCoreImportProps extends BaseFeatureConstructProps {
  solarSystem: ISolarSystemCore;
}

export class EcsFeatureCoreImport extends BaseFeatureConstruct implements IEcsFeatureCore {
  readonly solarSystem: ISolarSystemCore;
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  readonly httpInternalListener: IApplicationListener;
  readonly httpsListener: IApplicationListener;
  readonly httpsInternalListener: IApplicationListener;

  constructor(scope: Construct, id: string, props: EcsFeatureCoreImportProps) {
    super(scope, id, props);

    const { solarSystem } = props;

    this.solarSystem = solarSystem;

    this.cluster = RemoteCluster.import(this, 'Cluster', this.singletonId('Cluster'), this.solarSystem.vpc);
    this.alb = RemoteAlb.import(this, 'Alb', this.singletonId('Alb'), this.solarSystem.vpc);
    this.httpListener = RemoteApplicationListener.import(this, 'HttpListener', this.singletonId('HttpListener'));
    this.httpInternalListener = RemoteApplicationListener.import(
      this,
      'HttpInternalListener',
      this.singletonId('HttpInternalListener')
    );
    this.httpsListener = RemoteApplicationListener.import(this, 'HttpsListener', this.singletonId('HttpsListener'));
    this.httpsInternalListener = RemoteApplicationListener.import(
      this,
      'HttpsInternalListener',
      this.singletonId('HttpsInternalListener')
    );
  }
}

declare module '../../solar-system/solar-system-core-import' {
  interface SolarSystemCoreImport {
    ecs?: EcsFeatureCoreImport;
    addEcs(props?: Partial<EcsFeatureCoreImportProps>): EcsFeatureCoreImport;
  }
}

SolarSystemCoreImport.prototype.addEcs = function (props?: Partial<EcsFeatureCoreImportProps>): EcsFeatureCoreImport {
  this.ecs = new EcsFeatureCoreImport(this, 'Ecs', {
    solarSystem: this,
    ...props,
  });
  return this.ecs;
};
