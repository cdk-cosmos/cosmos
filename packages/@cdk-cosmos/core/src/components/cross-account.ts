import { Construct, Fn, Duration, Lazy, Stack } from '@aws-cdk/core';
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

    const lazyExports = Lazy.listValue({
      produce: () => {
        const zoneName = solarSystem.zone.node.tryFindChild('ZoneName') as Output;
        const zoneNameServers = solarSystem.zone.node.tryFindChild('NameServers') as Output;
        if (!zoneName || !zoneNameServers) {
          throw new Error("Look like the Zone has not been exported or doesn't have name servers");
        }
        return [zoneName.exportName, zoneNameServers.exportName];
      },
    });

    this.exports = new CrossAccountExports(cosmos.link, `${solarSystem.node.id}${id}Exports`, {
      exports: lazyExports,
      fn: cosmos.crossAccountExportsFn,
      assumeRoleArn: solarSystem.galaxy.cdkCrossAccountRoleStaticArn,
    });

    const zoneNameRef = Lazy.stringValue({
      produce: () => this.exports.get(Stack.of(this).resolve(lazyExports)[0]),
    });
    const zoneNameServersRef = Lazy.stringValue({
      produce: () => this.exports.get(Stack.of(this).resolve(lazyExports)[1]),
    });
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
