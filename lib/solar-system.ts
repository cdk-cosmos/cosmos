import { Construct } from "@aws-cdk/core";
import { GalaxyStack } from "./galaxy";
import { IVpc } from "@aws-cdk/aws-ec2";

export interface ISolarSystem extends Construct {
  galaxy: GalaxyStack;
  vpc: IVpc;
}
