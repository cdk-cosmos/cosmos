import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { CosmosStack } from "./cosmos";

export interface GalaxyStackProps extends StackProps {}

export class GalaxyStack extends Stack {
  readonly cosmos: CosmosStack;
  readonly account: string;

  constructor(cosmos: CosmosStack, account: string, props?: GalaxyStackProps) {
    super(cosmos.app, `Cosmos-${account}-Galaxy`, props);

    this.cosmos = cosmos;
    this.account = account;
  }
}
