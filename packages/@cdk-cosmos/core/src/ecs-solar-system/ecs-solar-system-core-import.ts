import { ICluster } from '@aws-cdk/aws-ecs';
import { IApplicationLoadBalancer, IApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';
import { IGalaxyCore } from '../galaxy/galaxy-core-stack';
import { RemoteCluster, RemoteAlb, RemoteApplicationListener } from '../helpers/remote';
import { SolarSystemCoreImport, SolarSystemCoreImportProps } from '../solar-system/solar-system-core-import';
import { IEcsSolarSystemCore } from './ecs-solar-system-core-stack';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const EcsSolarSystemCoreImportBuilder = (base: typeof SolarSystemCoreImport) => {
  class EcsSolarSystemCoreImport extends base implements IEcsSolarSystemCore {
    readonly cluster: ICluster;
    readonly alb: IApplicationLoadBalancer;
    readonly httpListener: IApplicationListener;
    readonly httpInternalListener: IApplicationListener;
    readonly httpsListener: IApplicationListener;
    readonly httpsInternalListener: IApplicationListener;

    constructor(galaxy: IGalaxyCore, id: string, props?: SolarSystemCoreImportProps) {
      super(galaxy, id, props);

      this.cluster = RemoteCluster.import(this, this.singletonId('Cluster'), this.vpc);
      this.alb = RemoteAlb.import(this, this.singletonId('Alb'));
      this.httpListener = RemoteApplicationListener.import(this, this.singletonId('HttpListener'));
      this.httpInternalListener = RemoteApplicationListener.import(this, this.singletonId('HttpInternalListener'));
      this.httpsListener = RemoteApplicationListener.import(this, this.singletonId('HttpsListener'));
      this.httpsInternalListener = RemoteApplicationListener.import(this, this.singletonId('HttpsInternalListener'));
    }
  }

  return EcsSolarSystemCoreImport;
};

export const EcsSolarSystemCoreImport = EcsSolarSystemCoreImportBuilder(SolarSystemCoreImport);
