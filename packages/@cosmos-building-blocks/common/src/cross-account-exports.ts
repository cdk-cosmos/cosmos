import { Construct, Stack, Reference, Duration } from '@aws-cdk/core';
import { CustomResource, CustomResourceProvider } from '@aws-cdk/aws-cloudformation';
import { IFunction, Function, FunctionProps, Runtime, Code } from '@aws-cdk/aws-lambda';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

export class CrossAccountExportsFn extends Function {
  constructor(scope: Construct, id: string, props?: Partial<FunctionProps>) {
    super(scope, id, {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(`${__dirname}/cross-account-stack-ref-handler.zip`),
      handler: 'index.handler',
      timeout: Duration.seconds(60),
      ...props,
    });

    // istanbul ignore next
    if (!props?.role) {
      this.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationReadOnlyAccess'));
    }
  }
}

export interface CrossAccountExportsProps {
  exports: string[];
  shouldErrorIfNotFound?: boolean;
  assumeRoleArn?: string;
  fn?: IFunction;
  alwaysUpdate?: boolean;
}

export class CrossAccountExports extends Construct {
  readonly exports: string[];
  readonly resource: CustomResource;
  readonly fn: IFunction;

  constructor(scope: Construct, id: string, props: CrossAccountExportsProps) {
    super(scope, id);

    const { exports, shouldErrorIfNotFound, assumeRoleArn, alwaysUpdate = false } = props;
    let { fn } = props;

    this.exports = exports;

    if (!fn) {
      fn = Stack.of(this).node.tryFindChild('CrossAccountExportsFn') as IFunction | undefined;
    }
    if (!fn) {
      fn = new CrossAccountExportsFn(Stack.of(this), 'CrossAccountExportsFn');
    }

    this.fn = fn;

    this.resource = new CustomResource(this, 'Resource', {
      provider: CustomResourceProvider.fromLambda(fn),
      resourceType: 'Custom::CrossAccountExports',
      properties: {
        exports: this.exports,
        shouldErrorIfNotFound,
        assumeRoleArn,
        runAt: alwaysUpdate ? new Date(Date.now()).toLocaleString() : undefined,
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
