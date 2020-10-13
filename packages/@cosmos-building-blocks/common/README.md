# Common

Constructs and tools common to all Cosmos projects. 

## The Cosmos CDK Toolkit

Before a Cosmos core or extension can be bootstrapped to AWS accounts, the necessary bootstrapping resources first need to be deployed. Those resources are part of the Cosmos CDK Toolkit.

The AWS CDK already provides a toolkit for use in its [boostrapping process](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html), but the Cosmos extends this toolkit with additional functionality to make deploying a Cosmos core or extension easier. The Cosmos CDK Toolkit includes, in addition to an s3 bucket for staging assets, a CodeBuild project that deploys your CDK. Because this deploy project runs in AWS as opposed to on your local workstation, the necessary roles are already configured for you.

When the steps below are completed you'll be able to [run the Bootstrapper App](#using-the-boostrapper), which archives your current working directory, copies it to the CDK Toolkit s3 bucket in your master account, and triggers the CodeBuild job to bootstrap your Cosmos core or extension. 

### Bootstrapping the Bootstrapper 

Deploying the Cosmos CDK Toolkit requires the following environment variables to be exported in your local environment:

- `AWS_MASTER_ACCOUNT`: Your management account in a typical multi-account pattern. 
- `AWS_ACCOUNT`: The account in which the Cosmos CDK Toolkit will be deployed. This may be the master account. 

For example:
```
export AWS_MASTER_ACCOUNT=11111111
export AWS_ACCOUNT=22222222
```

Then use the below command to deploy the Cosmos CDK Toolkit resources to your environments.

`npx cdk bootstrap --template "node_modules/@cosmos-building-blocks/common/lib/cdk-toolkit/template.yaml" --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --trust ${AWS_MASTER_ACCOUNT} aws://${AWS_ACCOUNT}/ap-southeast-2`

- `--template` substitutes the regular CDK Toolkit template with the Cosmos version
- `--cloudformation-execution-policies` attaches the required policy to the deployment role
- `--trust` defines the AWS account that may deploy into the environment being bootstrapped

This command will need to be run once for each AWS account in your multi-account pattern, substituting the `AWS_ACCOUNT` environment variable each time to target each account. You will need to have the required credentials for each account either in your AWS CLI configuration or exported locally as environment variables. 

### Using the Boostrapper 

Once the The Cosmos CDK Toolkit is deployed, it can be used to bootstrap your Cosmos core or extension. 

Run the below command in the base directory of your project and it will archive your project and pass it as an asset to the CDK Toolkit s3 bucket in your master account, and trigger the CodeBuild job to bootstrap your Cosmos core or extension. 

`npx cdk --app "@cosmos-building-blocks/common/lib/cdk-toolkit/bootstrap-app.js" deploy`

The command will default to deploying a Cosmos extension. To deploy a Cosmos core set environment variable `CORE` to `true`:

`CORE=true npx cdk --app "@cosmos-building-blocks/common/lib/cdk-toolkit/bootstrap-app.js" deploy`

To deploy only specific stacks, set environment variable `STACKS` to the required stacks. 

`STACKS="Stack1 Stack2" npx cdk --app "@cosmos-building-blocks/common/lib/cdk-toolkit/bootstrap-app.js" deploy`

