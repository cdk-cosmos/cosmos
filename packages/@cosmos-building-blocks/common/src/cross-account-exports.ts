import {
  Construct,
  Reference,
  Duration,
  CustomResource,
  CustomResourceProvider,
  CustomResourceProviderRuntime,
} from '@aws-cdk/core';
import { IRole } from '@aws-cdk/aws-iam';
import './custom-resource-provider';

export const RESOURCE_TYPE = 'Custom::CrossAccountExports';

export interface CrossAccountExportsProps {
  exports: string[];
  serviceToken?: string;
  assumeRoleArn?: string;
  shouldErrorIfNotFound?: boolean;
  alwaysUpdate?: boolean;
}

export class CrossAccountExports extends Construct {
  readonly exports: string[];
  readonly resource: CustomResource;
  readonly serviceToken: string;

  constructor(scope: Construct, id: string, props: CrossAccountExportsProps) {
    super(scope, id);

    const { serviceToken, assumeRoleArn, shouldErrorIfNotFound = true, alwaysUpdate = false } = props;

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
    return this.getRef(name).map((x) => x.toString());
  }

  getRef(name: string): Reference;
  getRef(name?: string[]): Reference[];
  getRef(name?: string | string[]): Reference | Reference[] {
    if (typeof name === 'string') {
      return this.resource.getAtt(name);
    }
    if (name) {
      return name.map((x) => this.resource.getAtt(x));
    }
    return this.exports.map((x) => this.resource.getAtt(x));
  }
}

export const createCrossAccountExportProvider = (scope: Construct, role?: IRole): string => {
  const serviceToken = CustomResourceProvider.getOrCreate(scope, RESOURCE_TYPE, {
    codeDirectory: `${__dirname}/cross-account-export-handler`,
    runtime: CustomResourceProviderRuntime.NODEJS_12,
    timeout: Duration.minutes(5),
    role,
  });
  return serviceToken;
};
