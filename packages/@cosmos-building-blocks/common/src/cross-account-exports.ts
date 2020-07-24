import * as path from 'path';
import * as fs from 'fs';
import {
  Construct,
  Reference,
  Duration,
  CustomResource,
  CustomResourceProviderRuntime,
  Stack,
  CustomResourceProviderProps,
  FileAssetPackaging,
  AssetStaging,
  CfnResource,
  Size,
  Token,
} from '@aws-cdk/core';
import { IRole } from '@aws-cdk/aws-iam';

export const RESOURCE_TYPE = 'Custom::CrossAccountExports';

export interface CrossAccountExportsProps {
  exports: string[];
  serviceToken?: string;
  shouldErrorIfNotFound?: boolean;
  assumeRoleArn?: string;
  alwaysUpdate?: boolean;
}

export class CrossAccountExports extends Construct {
  readonly exports: string[];
  readonly resource: CustomResource;
  readonly serviceToken: string;

  constructor(scope: Construct, id: string, props: CrossAccountExportsProps) {
    super(scope, id);

    const { shouldErrorIfNotFound, assumeRoleArn, alwaysUpdate = false, serviceToken } = props;

    this.exports = props.exports;

    this.serviceToken = serviceToken || createCrossAccountExportProvider(this);

    this.resource = new CustomResource(this, 'Resource', {
      serviceToken: this.serviceToken,
      resourceType: RESOURCE_TYPE,
      properties: {
        exports: this.exports,
        shouldErrorIfNotFound,
        assumeRoleArn,
        runAt: alwaysUpdate ? new Date(Date.now()).toISOString() : undefined,
      },
    });
  }

  get(name: string): string;
  get(name?: string[]): string[];
  get(name?: string | string[]): string | string[] {
    if (typeof name === 'string') {
      return this.getRef(name).toString();
    }
    return this.getRef(name).map(x => x.toString());
  }

  getRef(name: string): Reference;
  getRef(name?: string[]): Reference[];
  getRef(name?: string | string[]): Reference | Reference[] {
    if (typeof name === 'string') {
      return this.resource.getAtt(name);
    }
    if (name) {
      return name.map(x => this.resource.getAtt(x));
    }
    return this.exports.map(x => this.resource.getAtt(x));
  }
}

export const createCrossAccountExportProvider = (scope: Construct, role?: IRole): string => {
  return CustomResourceProvider.getOrCreate(scope, RESOURCE_TYPE, {
    codeDirectory: `${__dirname}/cross-account-handler`,
    runtime: CustomResourceProviderRuntime.NODEJS_12,
    timeout: Duration.minutes(5),
    role,
  });
};

// FROM AWS CDK (FIXME:)

const ENTRYPOINT_FILENAME = '__entrypoint__';
const ENTRYPOINT_NODEJS_SOURCE = require.resolve('@aws-cdk/core/lib/custom-resource-provider/nodejs-entrypoint.js');

class CustomResourceProvider extends Construct {
  public static getOrCreate(
    scope: Construct,
    uniqueid: string,
    props: CustomResourceProviderProps & { role?: IRole }
  ): string {
    const id = `${uniqueid}CustomResourceProvider`;
    const stack = Stack.of(scope);
    const provider =
      (stack.node.tryFindChild(id) as CustomResourceProvider) ?? new CustomResourceProvider(stack, id, props);

    return provider.serviceToken;
  }

  public readonly serviceToken: string;

  protected constructor(scope: Construct, id: string, props: CustomResourceProviderProps & { role?: IRole }) {
    super(scope, id);

    const stack = Stack.of(scope);

    // copy the entry point to the code directory
    fs.copyFileSync(ENTRYPOINT_NODEJS_SOURCE, path.join(props.codeDirectory, `${ENTRYPOINT_FILENAME}.js`));

    // verify we have an index file there
    if (!fs.existsSync(path.join(props.codeDirectory, 'index.js'))) {
      throw new Error(`cannot find ${props.codeDirectory}/index.js`);
    }

    const staging = new AssetStaging(this, 'Staging', {
      sourcePath: props.codeDirectory,
    });

    const asset = stack.addFileAsset({
      fileName: staging.stagedPath,
      sourceHash: staging.sourceHash,
      packaging: FileAssetPackaging.ZIP_DIRECTORY,
    });

    const policies = !props.policyStatements
      ? undefined
      : [
          {
            PolicyName: 'Inline',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: props.policyStatements,
            },
          },
        ];

    const role = !props.role
      ? new CfnResource(this, 'Role', {
          type: 'AWS::IAM::Role',
          properties: {
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                { Action: 'sts:AssumeRole', Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' } },
              ],
            },
            ManagedPolicyArns: [
              { 'Fn::Sub': 'arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
            ],
            Policies: policies,
          },
        })
      : undefined;
    const roleArn = props.role ? props.role.roleArn : role?.getAtt('Arn');

    const timeout = props.timeout ?? Duration.minutes(15);
    const memory = props.memorySize ?? Size.mebibytes(128);

    const handler = new CfnResource(this, 'Handler', {
      type: 'AWS::Lambda::Function',
      properties: {
        Code: {
          S3Bucket: asset.bucketName,
          S3Key: asset.objectKey,
        },
        Timeout: timeout.toSeconds(),
        MemorySize: memory.toMebibytes(),
        Handler: `${ENTRYPOINT_FILENAME}.handler`,
        Role: roleArn,
        Runtime: 'nodejs12.x',
      },
    });

    handler.addDependsOn(role || (props.role?.node.defaultChild as CfnResource));

    this.serviceToken = Token.asString(handler.getAtt('Arn'));
  }
}
