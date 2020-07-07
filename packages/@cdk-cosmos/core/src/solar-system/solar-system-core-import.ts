import { IVpc } from '@aws-cdk/aws-ec2';
import { Construct } from '@aws-cdk/core';
import { IPublicHostedZone, IPrivateHostedZone } from '@aws-cdk/aws-route53';
import { IGalaxyCore } from '../galaxy/galaxy-core-stack';
import { BaseConstruct, BaseConstructProps } from '../components/base';
import { RemoteVpc, RemoteZone, RemoteVpcImportProps } from '../helpers/remote';
import { ISolarSystemCore } from './solar-system-core-stack';

export interface SolarSystemCoreImportProps extends BaseConstructProps {
  galaxy: IGalaxyCore;
  vpcProps?: Partial<RemoteVpcImportProps>;
}

export class SolarSystemCoreImport extends BaseConstruct implements ISolarSystemCore {
  readonly galaxy: IGalaxyCore;
  readonly vpc: IVpc;
  readonly zone: IPublicHostedZone;
  readonly privateZone: IPrivateHostedZone;

  constructor(scope: Construct, id: string, props: SolarSystemCoreImportProps) {
    super(scope, id, {
      type: 'SolarSystem',
      partition: 'Core',
      ...props,
    });

    const { galaxy, vpcProps = {} } = props || {};

    this.galaxy = galaxy;
    this.vpc = RemoteVpc.import(this, 'Vpc', this.singletonId('Vpc'), {
      aZs: 2,
      isolatedSubnetNames: ['App'],
      ...vpcProps,
    });
    this.zone = RemoteZone.import(this, 'Zone', this.singletonId('Zone'));
    this.privateZone = RemoteZone.import(this, 'PrivateZone', this.singletonId('PrivateZone'));
  }
}
