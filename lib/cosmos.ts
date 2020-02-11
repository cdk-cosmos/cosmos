import { App, Stack, StackProps } from "@aws-cdk/core";
import { HostedZone, IHostedZone } from "@aws-cdk/aws-route53";

export interface CosmosStackProps extends StackProps {
  tld: string;
}

export class CosmosStack extends Stack {
  readonly app: App;
  readonly domain: string;
  readonly zone: HostedZone;
  constructor(app: App, domain: string, props: CosmosStackProps) {
    super(app, "Cosmos", props);

    this.app = app;
    this.domain = domain;

    const { tld } = props;

    this.zone = new HostedZone(this, "HostedZone", {
      zoneName: `${domain}.${tld}`.toLowerCase()
    });
  }
}
