import { IVpc } from '@aws-cdk/aws-ec2';
import { IPublicHostedZone, IPrivateHostedZone } from '@aws-cdk/aws-route53';
import { IGalaxyCore } from '../galaxy/galaxy-core-stack';
import { BaseConstruct, BaseConstructProps } from '../components/base';
import { RemoteVpc, RemoteZone, RemoteVpcImportProps } from '../helpers/remote';
import { ISolarSystemCore } from './solar-system-core-stack';

export interface SolarSystemCoreImportProps extends BaseConstructProps {
  vpcProps?: Partial<RemoteVpcImportProps>;
}

export class SolarSystemCoreImport extends BaseConstruct implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: IVpc;
  readonly zone: IPublicHostedZone;
  readonly privateZone: IPrivateHostedZone;

  constructor(galaxy: IGalaxyCore, id: string, props?: SolarSystemCoreImportProps) {
    super(galaxy, id, {
      type: 'SolarSystem',
      ...props,
    });

    const { vpcProps = {} } = props || {};

    this.galaxy = galaxy;
    this.vpc = RemoteVpc.import(this, this.singletonId('Vpc'), {
      aZs: 2,
      isolatedSubnetNames: ['App'],
      ...vpcProps,
    });
    this.zone = RemoteZone.import(this, this.singletonId('Zone'));
    this.privateZone = RemoteZone.import(this, this.singletonId('PrivateZone'));
  }
}
