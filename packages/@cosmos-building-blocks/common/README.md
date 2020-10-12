# Common

Constructs and tools common to all Cosmos projects. 

## The Cosmos CDK Toolkit: Bootstrapping the Bootstrapper 

Before a Cosmos core or extension can be bootstrapped to your AWS accounts, the necessary bootstrapping tool first needs to be deployed. That tool is the Cosmos CDK Toolkit.

The AWS CDK already provides a toolkit for use in its [boostrapping process](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html), but the Cosmos extends this toolkit with additional functionality to make deploying a Cosmos core or extension easier. The Cosmos CDK Toolkit includes, in addition to an s3 bucket for staging assets, a CodeBuild project that deploys your CDK. Because this deploy project runs in AWS as opposed to on your local workstation, the necessary roles are already configured for you.

When the steps below are completed you'll be able to run the command in [Step 2](#step-2) that archives your current working directory, copies it to the CDK Toolkit s3 bucket in your master account, and triggers the CodeBuild job to deploy your Cosmos CICD Solarsystem. Once the CICD Solarsystem it deployed, its pipeline should be used to roll out any further changes to the your Cosmos.

## Step 1

Deploying the Cosmos CDK Toolkit requires the following environment variables to be exported in your local environment:

- `AWS_MASTER_ACCOUNT`: Your management account in a typical multi-account pattern. 
- `AWS_ACCOUNT`: The account in which the Cosmos CDK Toolkit will be deployed. This may be the master account. 

For example:
```
export AWS_MASTER_ACCOUNT=11111111
export AWS_ACCOUNT=22222222
```

These steps will need to be taken once for each AWS account in your multi-account pattern, substituting the `AWS_ACCOUNT` variable each time to target each account. 

## Step 2

Use the `cdk bootstrap` command to deploy the Cosmos CDK Toolkit resources to your environments.

`npx cdk bootstrap --template "node_modules/@cosmos-building-blocks/common/lib/cdk-toolkit/template.yaml" --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --trust ${AWS_MASTER_ACCOUNT} aws://${AWS_ACCOUNT}/ap-southeast-2`

- `--template` substitutes the regular CDK Toolkit template with the Cosmos version
- `--cloudformation-execution-policies` attaches the required policy to the deployment role
- `--trust` defines the AWS account that may deploy into the environment being bootstrapped


# Questions:
- are the template and the below app two different things?
- or does the template somehow deploy the app?
- or does the template just define the same resources that are in the app?
- does the template need CORE and STACK env vars defined?


### Bootstrap CDK App (Core|Extension)

This will send the current working directory to the bootstrap build job which will run cdk deploy on the cdk app.
Since this bootstrap job runs in aws, you don't have to worry about roles etc for bootstrapping your cdk app as long as the CDKToolkit has been deployed.

This is done by zipping the cwd to s3 then sending that url to trigger a code build in aws.
You can manually do this your self if you like.

`npx cdk --app "@cosmos-building-blocks/common/lib/cdk-toolkit/bootstrap-app.js" deploy`

- Set `CORE=true` to deploy core stack, default to extension stacks.
- Set `STACKS="Stack1 Stack2"` to have direct control over the deployed stacks.