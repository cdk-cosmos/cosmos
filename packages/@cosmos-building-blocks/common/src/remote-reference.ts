import { Construct, Stack, Reference, Duration } from '@aws-cdk/core';
import { CustomResource, CustomResourceProvider } from '@aws-cdk/aws-cloudformation';
import { IFunction, Function, FunctionProps, Runtime, Code } from '@aws-cdk/aws-lambda';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

export class CrossAccountStackReferenceFn extends Function {
  constructor(scope: Construct, id: string, props?: Partial<FunctionProps>) {
    super(scope, id, {
      //   uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(`${__dirname}/cross-account-stack-ref-handler.zip`),
      handler: 'index.handler',
      timeout: Duration.seconds(60),
      ...props,
    });

    if (!props?.role) {
      this.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationReadOnlyAccess'));
    }
  }
}

export interface CrossAccountStackReferenceProps {
  exports: string | string[];
  shouldErrorIfNotFound?: boolean;
  assumeRolArn?: string;
  fn?: IFunction;
  alwaysUpdate?: boolean;
}

export class CrossAccountStackReference extends Construct {
  readonly exports: string[];
  readonly resource: CustomResource;
  readonly fn?: CrossAccountStackReferenceFn;

  constructor(scope: Construct, id: string, props: CrossAccountStackReferenceProps) {
    super(scope, id);

    const { exports, shouldErrorIfNotFound, assumeRolArn, alwaysUpdate = true } = props;
    let { fn } = props;

    this.exports = typeof exports === 'string' ? [exports] : exports;

    if (!fn) {
      fn = Stack.of(this).node.tryFindChild('CrossAccountStackReferenceFn') as IFunction | undefined;
    }
    if (!fn) {
      this.fn = new CrossAccountStackReferenceFn(Stack.of(this), 'CrossAccountStackReferenceFn');
      fn = this.fn;
    }

    this.resource = new CustomResource(this, 'Resource', {
      provider: CustomResourceProvider.fromLambda(fn),
      properties: {
        exports: this.exports,
        shouldErrorIfNotFound,
        assumeRolArn,
        runAt: alwaysUpdate ? new Date().toLocaleString() : undefined, // TODO: is this an issue really?
      },
    });
  }

  getExportRef(name?: string): Reference {
    return this.resource.getAtt(name || this.exports[0]);
  }

  getExport(name?: string): string {
    return this.resource.getAttString(name || this.exports[0]);
  }

  getExports(): string[] {
    return this.exports.map(x => this.getExport(x));
  }
}
