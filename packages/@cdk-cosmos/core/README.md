# Cosmos Core Package

This Library contains the base components for the CDK Cosmos. It defiles the Core Classes and the Extension Classes for the Core.
All other @cdk-cosmos packages will build on top of this core concept.

## Basic Understanding

Cosmos is broken down into 3 scopes (Bubbles)

- Cosmos: Top level scope of the entire infrastructure, mostly singleton shared resources.
- Galaxy: Account level scope that defines infrastructure for an aws account.
- SolarSystem: Environment level scope that defines infrastructure for an environment with in an aws account (Dev, Tst, Prd).

## Cosmos Core

The Cosmos core contains infrastructure that will be shared by consumers building apps (extensions).

The Core Cosmos is composed of:

- CosmosStack
  - TLD Zone
  - CDK Repo - for the core cdk code
  - CDK Master Role - for builds of the cdk deployments
- GalaxyStack
  - If Cross Account, create Cross Account CDK Role for master to assume
- SolarSystemStack
  - VPC (Created on the Galaxy scope, so that it can be shared by many SolarSystems in the same Galaxy)
  - Zone
- EcsSolarSystemStack
  - Cluster
  - Alb
  - HttpListener
- CiCdSolarSystemStack
  - VPC
  - Zone
  - Cluster
  - Alb
  - HttpListener
  - CDK Pipeline + Code Build for Deployment of the core

### Example

```js
const cosmos = new CosmosStack(app, 'Demo', {
  tld: 'cosmos.com',
  cidr: '10.0.0.0/22',
});

const mgtGalaxy = new GalaxyStack(cosmos, 'Mgt');

const ciCd = new CiCdSolarSystemStack(mgtGalaxy);

const dev = new EcsSolarSystemStack(mgtGalaxy, 'Dev');
```

## Cosmos Extensions

The Extensions are a way of consuming and adding resources in an isolated way. Each Extension has a Portal Property that is used to consume that core infrastructure for that same bubble.

The Extension of the core are:

- CosmosExtensionStack
  - Imports Core Cosmos
  - CDK Repo - for the app cdk code
- GalaxyExtensionStack
  - Imports Core Galaxy
- SolarSystemExtensionStack
  - Imports Core SolarSystem
- EcsSolarSystemExtensionStack
  - Imports Core EcsSolarSystem
- CiCdSolarSystemExtensionStack
  - Imports Core CiCdSolarSystem
  - CDK Pipeline + Code Build for Deployment of the app

### Example

```js
const cosmos = new CosmosExtensionStack(app, 'Demo');

const mgtGalaxy = new GalaxyExtensionStack(cosmos, 'Mgt');

const ciCd = new CiCdSolarSystemExtensionStack(mgtGalaxy);

const dev = new EcsSolarSystemExtensionStack(mgtGalaxy, 'Dev');
```

What is included in the above is just enough for the extension (App) to host its own code and deploy it self. From here we expect consumer to add their own infrastructure to extends from the core, into the respective bubbles.

## Further Use

For more extensive understanding and usage, please look at the docs, aka the [law of the cosmos](https://github.com/cdk-cosmos/law)

## Bootstrap Accounts

Define your master account `export AWS_MASTER_ACCOUNT=1111` and define the account you want to bootstrap (may be master account) `export AWS_ACCOUNT=2222`

Deploy CDKToolKit to Accounts: `npx cdk bootstrap --template "node_modules/@cosmos-building-blocks/common/lib/cdk-toolkit/template.yaml" --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --trust ${AWS_MASTER_ACCOUNT} aws://${AWS_ACCOUNT}/ap-southeast-2`

### Bootstrap CDK App (Core|Extension)

This will send the current working directory to the bootstrap build job which will run cdk deploy on the cdk app.
Since this bootstrap job runs in aws, you don't have to worry about roles etc for bootstrapping your cdk app as long as the CDKToolkit has been deployed.

This is done by zipping the cwd to s3 then sending that url to trigger a code build in aws.
You can manually do this your self if you like.

`npx cdk --app "@cosmos-building-blocks/common/lib/cdk-toolkit/bootstrap-app.js" deploy`

- Set `CORE=true` to deploy core stack, default to extension stacks.
- Set `STACKS="Stack1 Stack2"` to have direct control over the deployed stacks.