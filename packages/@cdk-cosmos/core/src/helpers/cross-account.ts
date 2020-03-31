import { Construct, Fn, Duration } from '@aws-cdk/core';
import { ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { CrossAccountExports } from '@cosmos-building-blocks/common';
import { Output } from '..';
import { SolarSystem } from '../interfaces';
import { getCosmos } from './utils';

export interface CrossAccountZoneDelegationRecordProps {
  comment?: string;
  ttl?: Duration;
}

export class CrossAccountZoneDelegationRecord extends Construct {
  readonly exports: CrossAccountExports;
  readonly delegationRecord: ZoneDelegationRecord;

  constructor(solarSystem: SolarSystem, id: string, props?: CrossAccountZoneDelegationRecordProps) {
    super(solarSystem, id);

    const { comment, ttl } = props || {};

    const cosmos = getCosmos(solarSystem);
    if (!cosmos.Link) throw new Error('Cosmos does not have a link stack. It is required');

    const zoneName = solarSystem.Zone.node.tryFindChild('ZoneName') as Output;
    const zoneNameServers = solarSystem.Zone.node.tryFindChild('NameServers') as Output;
    if (!zoneName || !zoneNameServers) {
      throw new Error("Look like the Zone has not been exported or doesn't have name servers");
    }

    this.exports = new CrossAccountExports(cosmos.Link, `${solarSystem.Name}${id}Exports`, {
      exports: [zoneName.exportName, zoneNameServers.exportName],
      fn: cosmos.CrossAccountExportsFn,
      assumeRoleArn: solarSystem.Galaxy.CdkCrossAccountRoleStaticArn,
    });

    const [zoneNameRef, zoneNameServersRef] = this.exports.get();
    this.delegationRecord = new ZoneDelegationRecord(cosmos.Link, `${solarSystem.Name}${id}`, {
      zone: cosmos.RootZone,
      recordName: zoneNameRef + '.',
      nameServers: Fn.split(',', zoneNameServersRef),
      ttl,
      comment,
    });

    cosmos.Link.node.addDependency(solarSystem.Zone);
  }
}
