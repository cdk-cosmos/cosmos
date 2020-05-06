import { Construct, Fn, Duration } from '@aws-cdk/core';
import { ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { CrossAccountExports } from '@cosmos-building-blocks/common';
import { ISolarSystemCore } from '../solar-system';
import { Output } from '../helpers/remote';

export interface CrossAccountZoneDelegationRecordProps {
  comment?: string;
  ttl?: Duration;
}

export class CrossAccountZoneDelegationRecord extends Construct {
  readonly exports: CrossAccountExports;
  readonly delegationRecord: ZoneDelegationRecord;

  constructor(solarSystem: ISolarSystemCore, id: string, props?: CrossAccountZoneDelegationRecordProps) {
    super(solarSystem, id);

    const { comment, ttl } = props || {};

    const cosmos = solarSystem.galaxy.cosmos;
    if (!cosmos.link) throw new Error('Cosmos does not have a link stack. It is required');

    const zoneName = solarSystem.zone.node.tryFindChild('ZoneName') as Output;
    const zoneNameServers = solarSystem.zone.node.tryFindChild('NameServers') as Output;
    if (!zoneName || !zoneNameServers) {
      throw new Error("Look like the Zone has not been exported or doesn't have name servers");
    }

    this.exports = new CrossAccountExports(cosmos.link, `${solarSystem.node.id}${id}Exports`, {
      exports: [zoneName.exportName, zoneNameServers.exportName],
      fn: cosmos.crossAccountExportsFn,
      assumeRoleArn: solarSystem.galaxy.cdkCrossAccountRoleStaticArn,
    });

    const [zoneNameRef, zoneNameServersRef] = this.exports.get();
    this.delegationRecord = new ZoneDelegationRecord(cosmos.link, `${solarSystem.node.id}${id}`, {
      zone: cosmos.rootZone,
      recordName: zoneNameRef + '.',
      nameServers: Fn.split(',', zoneNameServersRef),
      ttl,
      comment,
    });

    cosmos.link.node.addDependency(solarSystem.zone);
  }
}
