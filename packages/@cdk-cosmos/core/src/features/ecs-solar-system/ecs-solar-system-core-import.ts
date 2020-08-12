import { Construct } from '@aws-cdk/core';
import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { ISolarSystemCore } from '../../solar-system/solar-system-core-stack';
import { SolarSystemCoreImport } from '../../solar-system/solar-system-core-import';
import { IEcsSolarSystemCore } from './ecs-solar-system-core-stack';
import { BaseConstruct, BaseConstructProps } from '../../components/base';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from '../../helpers/remote';

export interface EcsSolarSystemCoreImportProps extends BaseConstructProps {
  solarSystem: ISolarSystemCore;
}

export class EcsSolarSystemCoreImport extends BaseConstruct implements IEcsSolarSystemCore {
  readonly solarSystem: ISolarSystemCore;
  readonly cluster: ICluster;
  readonly alb: IApplicationLoadBalancer;
  readonly httpListener: IApplicationListener;
  readonly httpInternalListener: IApplicationListener;
  readonly httpsListener: IApplicationListener;
  readonly httpsInternalListener: IApplicationListener;

  constructor(scope: Construct, id: string, props: EcsSolarSystemCoreImportProps) {
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
    ecs?: EcsSolarSystemCoreImport;
    addEcs(props?: Partial<EcsSolarSystemCoreImportProps>): EcsSolarSystemCoreImport;
  }
}

SolarSystemCoreImport.prototype.addEcs = function(
  props?: Partial<EcsSolarSystemCoreImportProps>
): EcsSolarSystemCoreImport {
  this.ecs = new EcsSolarSystemCoreImport(this, 'Ecs', {
    solarSystem: this,
    ...props,
  });
  return this.ecs;
};
