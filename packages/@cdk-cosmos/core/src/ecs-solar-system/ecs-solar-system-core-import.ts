import { Construct } from '@aws-cdk/core';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from '../helpers/remote';
import { SolarSystemCoreImport, SolarSystemCoreImportProps } from '../solar-system/solar-system-core-import';
import { IEcsSolarSystemCore } from './ecs-solar-system-core-stack';

export const EcsSolarSystemCoreImportBuilder = (
  base: typeof SolarSystemCoreImport
): typeof EcsSolarSystemCoreImportBase => {
  return class EcsSolarSystemCoreImport extends base implements IEcsSolarSystemCore {
    readonly cluster: ICluster;
    readonly alb: IApplicationLoadBalancer;
    readonly httpListener: IApplicationListener;
    readonly httpInternalListener: IApplicationListener;
    readonly httpsListener: IApplicationListener;
    readonly httpsInternalListener: IApplicationListener;

    constructor(scope: Construct, id: string, props: SolarSystemCoreImportProps) {
      super(scope, id, props);

      this.cluster = RemoteCluster.import(this, 'Cluster', this.singletonId('Cluster'), this.vpc);
      this.alb = RemoteAlb.import(this, 'Alb', this.singletonId('Alb'), this.vpc);
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
  };
};

// Implementations

declare class EcsSolarSystemCoreImportBase extends SolarSystemCoreImport implements IEcsSolarSystemCore {
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  readonly httpInternalListener: IApplicationListener;
  readonly httpsListener: IApplicationListener;
  readonly httpsInternalListener: IApplicationListener;

  constructor(scope: Construct, id: string, props: SolarSystemCoreImportProps);
}

export class EcsSolarSystemCoreImport extends EcsSolarSystemCoreImportBuilder(SolarSystemCoreImport) {}
