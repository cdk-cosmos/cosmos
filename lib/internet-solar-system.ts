import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { IVpc } from "@aws-cdk/aws-ec2";

import { GalaxyStack, ISolarSystem } from ".";

export interface InternetSolarSystemStackProps extends StackProps {}

export class InternetSolarSystemStack extends Stack implements ISolarSystem {
  readonly galaxy: GalaxyStack;
  readonly vpc: IVpc;
}
