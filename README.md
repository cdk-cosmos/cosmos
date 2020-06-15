# Cosmos ![Cosmos Coverage](https://raw.githubusercontent.com/cdk-cosmos/cosmos/master/shields/coverage.svg)

![Cosmos Logo](https://raw.githubusercontent.com/cdk-cosmos/law/master/static/img/cosmos-logo.png)

Cosmos builds an opinionated layer on top of the AWS CDK, providing smart defaults for enterprise infrastructure. 

## Why use Cosmos?

While the CDK provides constructs to leverage hundreds of AWS resources, it doesn't support commonly used patterns for enterprise infrastructure out of the box. Cosmos gives you high-level constructs to easily implement a multiple-account architecture across your AWS portfolio. It provides configuration for a CI/CD account that manages deployments to development, test, and production accounts in whatever combination is required. It also delivers a range of pre-built strategies to manage ECS clusters, CI/CD pipelines, ALBs, cross-account roles, shared VPCs, and much more.

## Highly customisable 

Although Cosmos is opinionated, as a consumer you're able to access and modify the underlying CDK. This means you can customise and tune the constructs however you want. And as Cosmos is open source, if you can't find the exact construct you need, you're encouraged to create it yourself and contribute back to the project so others can make use of your work. 

## How it works 

To organise resources, Cosmos uses a cosmological naming scheme. 

At the top level, scoped to multiple accounts, there is the Cosmos itself. Here we put resources required by all accounts, for example a hosted zone for the top-level domain, and a CodeCommit repository to store the CDK code of your Cosmos.

Nested in the Cosmos are the Galaxy constructs. Galaxies are scoped to a single account. Here we put resources shared across different application environments within one account, for example VPCs, s3 buckets, and ECR.

Nested in the Galaxies are Solar System constructs. Solar Systems are scoped to an application environment such as development, test, or production. Here we put what's necessary to deploy an application, for example ECS clusters or s3 buckets for static web sites. 

### Core and Extension

Core and Extension are two different categories of Cosmos/CDK code stored in different repositories. They both define resources using Cosmos and CDK constructs, but they're separated to ensure the critical resources of the accounts (Core) are decoupled from the resources scoped to individual applications (Extensions). 

Basically, the Core contains the essential resources and configurations you don't want most people getting their hands on and changing, while Extensions can be more freely configured without the risk of impacting other applications within the same Cosmos.

## Getting Started

### The Big Bang

Cosmos provides code templates for both the [Core](https://github.com/cdk-cosmos/cosmos-core-cdk) and [Extensions](https://github.com/cdk-cosmos/cosmos-extension-cdk). These templates define the minimal infrastructure needed to get started with Cosmos, such as a hosted zone for the top-level domain, the CDK master role, and more. These templates also define the CI/CD pipelines needed to deploy themselves, which presents a problem: the pipelines won't exist until the template is deployed, but the template can't be automatically deployed until the pipeline exists. To solve this, Cosmos needs to be manually deployed once — a process we call the Big Bang.

Follow the getting started instructions in the [Core](https://github.com/cdk-cosmos/cosmos-core-cdk) and [Extensions](https://github.com/cdk-cosmos/cosmos-extension-cdk) templates to trigger the Big Bang and begin using Cosmos.
