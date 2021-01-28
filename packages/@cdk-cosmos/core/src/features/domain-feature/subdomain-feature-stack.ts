import { Construct, Duration, Fn } from '@aws-cdk/core';
import { HostedZone, ZoneDelegationRecord } from '@aws-cdk/aws-route53';
import { IVpc } from '@aws-cdk/aws-ec2';
import { CrossAccountExports } from '@cosmos-building-blocks/common';
import { RemoteZone } from '../../components/remote';
import { CosmosCoreStack } from '../../cosmos/cosmos-core-stack';
import { ICosmosExtension } from '../../cosmos/cosmos-extension-stack';
import { ISolarSystemCore, SolarSystemCoreStack } from '../../solar-system/solar-system-core-stack';
import { ISolarSystemExtension, SolarSystemExtensionStack } from '../../solar-system/solar-system-extension-stack';
import { isCrossAccount } from '../../helpers/utils';
import { Domain } from './domain-feature-stack';
import { GalaxyCoreStack, IGalaxyExtension } from '../../galaxy';

export interface SubdomainProps {
  /**
   * The Domain to create this Subdomain under;
   */
  readonly domain: Domain;
  /**
   * The Sub Domain Name
   */
  readonly subdomain: string;
  /**
   * Export name for the Subdomain
   */
  readonly exportName: string;

  /**
   * Link the Subdomain
   */
  readonly link?: boolean;
  /**
   * A VPC that you want to associate with this hosted zone.
   *
   * When you specify
   * this property, a private hosted zone will be created.
   *
   * You can associate additional VPCs to this private zone using `addVpc(vpc)`.
   *
   * @default public (no VPCs associated)
   */
  readonly vpcs?: IVpc[];
  /**
   * The Amazon Resource Name (ARN) for the log group that you want Amazon Route 53 to send query logs to.
   *
   * @default disabled
   */
  readonly queryLogsLogGroupArn?: string;
}

export class Subdomain extends HostedZone {
  readonly scope: ISolarSystemCore | ISolarSystemExtension;
  readonly domain: Domain;
  readonly export: RemoteZone;

  constructor(scope: ISolarSystemCore | ISolarSystemExtension, id: string, props: SubdomainProps) {
    super(scope, id, {
      zoneName: `${props.subdomain}.${props.domain.zoneName}`,
      vpcs: props.vpcs,
      queryLogsLogGroupArn: props.queryLogsLogGroupArn,
      comment: `${props.subdomain} Subdomain for ${props.domain.zoneName}`,
    });

    const { domain, exportName, link = true } = props;

    this.scope = scope;
    this.domain = domain;

    this.export = new RemoteZone(this, exportName);

    if (link) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let zoneScope: Construct = this;
      let zoneName = this.zoneName;
      let hostedZoneNameServers: string[] = this.hostedZoneNameServers as string[];

      if (isCrossAccount(this, this.domain)) {
        const link = this.domain.scope.link;
        if (!link) throw new Error('Link Stack not found.');

        zoneScope = new Construct(link, this.node.path);

        const cosmosCore = CosmosCoreStack.isCosmosCore(this.domain.scope)
          ? this.domain.scope
          : (this.domain.scope as ICosmosExtension).portal;

        const galaxyCore = GalaxyCoreStack.isGalaxyCore(this.scope.galaxy)
          ? this.scope.galaxy
          : (this.scope.galaxy as IGalaxyExtension).portal;

        if (!this.export.hostedZoneNameServers)
          throw new Error('hostedZoneNameServers export is required for cross account linking');

        const crossAccountExports = new CrossAccountExports(zoneScope, `Exports`, {
          serviceToken: cosmosCore.crossAccountExportServiceToken,
          exports: [this.export.zoneName, this.export.hostedZoneNameServers],
          assumeRoleArn: galaxyCore.cdkCrossAccountRoleStaticArn,
        });

        zoneName = crossAccountExports.get(this.export.zoneName);
        hostedZoneNameServers = Fn.split(',', crossAccountExports.get(this.export.hostedZoneNameServers));

        zoneScope.node.addDependency(this);
      }

      new ZoneDelegationRecord(zoneScope, 'ZoneDelegation', {
        zone: this.domain,
        recordName: zoneName + '.',
        nameServers: hostedZoneNameServers,
        ttl: Duration.minutes(5),
        comment: `Subdomain Delegation for ${this.zoneName}.`,
      });
    }
  }
}

declare module '../../solar-system/solar-system-core-stack' {
  export interface SolarSystemCoreStack {
    addSubdomain(id: string, domain: Domain, subdomain: string): Subdomain;
  }
}

declare module '../../solar-system/solar-system-extension-stack' {
  export interface SolarSystemExtensionStack {
    addSubdomain(id: string, domain: Domain, subdomain: string): Subdomain;
  }
}

SolarSystemCoreStack.prototype.addSubdomain = function (id, domain, subdomain): Subdomain {
  const resource = new Subdomain(this, id, {
    domain: domain,
    subdomain: subdomain,
    exportName: this.singletonId(id),
  });
  return resource;
};

SolarSystemExtensionStack.prototype.addSubdomain = function (id, domain, subdomain): Subdomain {
  const resource = new Subdomain(this, id, {
    domain: domain,
    subdomain: subdomain,
    exportName: this.nodeId(id),
  });
  return resource;
};
