import * as fs from 'fs';
import { Construct, Stack, StackProps, Fn } from '@aws-cdk/core';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy } from '@aws-cdk/custom-resources';
import { Role } from '@aws-cdk/aws-iam';

export interface CdkBootstrapProps extends StackProps {
  cdkToolkitStackName: string;
  stacks: string[];
}

export class CdkBootstrap extends Stack {
  constructor(scope: Construct, id: string, props: CdkBootstrapProps) {
    super(scope, id, {
      description: 'This Stack is used to bootstrap an CDK app.',
      ...props,
    });

    const { cdkToolkitStackName, stacks } = props;

    const source = new Asset(this, 'Source', {
      path: '.',
      exclude: fs
        .readFileSync('.gitignore')
        .toString()
        .split('\n'),
    });

    const trigger = new AwsCustomResource(this, 'TriggerDeploy', {
      onUpdate: {
        service: 'CodeBuild',
        action: 'startBuild',
        parameters: {
          projectName: Fn.importValue(`${cdkToolkitStackName}-ProjectName`),
          environmentVariablesOverride: [
            {
              name: 'S3_ARTIFACT_URL',
              value: source.s3ObjectUrl,
            },
            {
              name: 'STACKS',
              value: stacks.join(' '),
            },
          ],
        },
        physicalResourceId: PhysicalResourceId.fromResponse('build.id'),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
      role: Role.fromRoleArn(
        this,
        'TriggerDeployRole',
        `arn:aws:iam::${this.account}:role/${Fn.importValue(`${cdkToolkitStackName}-TriggerDeployRole`)}`,
        { mutable: false }
      ),
    });

    const policy = trigger.node.findChild('CustomResourcePolicy');
    trigger.node.tryRemoveChild(policy.node.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (trigger as any).customResource.node._actualNode._dependencies.delete(policy);
  }
}
