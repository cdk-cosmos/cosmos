import { Construct, Fn, Duration, Lazy, CfnOutput, IConstruct } from '@aws-cdk/core';
import { ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { CrossAccountExports } from '@cosmos-building-blocks/common';
import { ISolarSystemCore } from '../solar-system';

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

    const zoneNameExport = findLazyExportName(solarSystem.zone, 'ZoneName');
    const zoneNameServersExport = findLazyExportName(solarSystem.zone, 'ZoneNameServers');

    this.exports = new CrossAccountExports(cosmos.link, `${solarSystem.node.id}${id}Exports`, {
      serviceToken: cosmos.crossAccountExportServiceToken,
      exports: [zoneNameExport, zoneNameServersExport],
      assumeRoleArn: solarSystem.galaxy.cdkCrossAccountRoleStaticArn,
    });

    const [zoneName, zoneNameServers] = this.exports.get([zoneNameExport, zoneNameServersExport]);

    this.delegationRecord = new ZoneDelegationRecord(cosmos.link, `${solarSystem.node.id}${id}`, {
      zone: cosmos.rootZone,
      recordName: zoneName + '.',
      nameServers: Fn.split(',', zoneNameServers),
      ttl,
      comment,
    });

    cosmos.link.node.addDependency(solarSystem.zone);
  }
}

const findLazyExportName = (scope: IConstruct, id: string): string =>
  Lazy.stringValue({ produce: () => (scope.node.findChild(id) as CfnOutput).exportName });
