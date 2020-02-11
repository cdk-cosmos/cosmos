#!/usr/bin/env node
import "source-map-support/register";
import { App } from "@aws-cdk/core";
import {
  CosmosStack,
  GalaxyStack,
  TargetSolarSystemStack,
  EcsTargetSolarSystemStack
} from "../lib";

const app = new App();

// The Cosmos
const cosmos = new CosmosStack(app, "Devops", {
  tld: "cosmos.com"
});

// MGT Account
const mgtGalaxy = new GalaxyStack(cosmos, "Mgt");

const devTargetSolarSystem = new EcsTargetSolarSystemStack(mgtGalaxy, "Dev");

const tstTargetSolarSystem = new EcsTargetSolarSystemStack(mgtGalaxy, "Tst");

// PRD Account
const prdGalaxy = new GalaxyStack(cosmos, "Prd");
// const prdSolarSystem = new SolarSystemStack(prdGalaxy, "PrdSolarSystem");
