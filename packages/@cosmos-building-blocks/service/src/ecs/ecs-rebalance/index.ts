import { Construct, Duration } from '@aws-cdk/core';
import { ICluster } from '@aws-cdk/aws-ecs';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Rule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';

export interface EcsEc2ServiceRebalanceProps {
  cluster: ICluster;
}

export class EcsEc2ServiceRebalance extends Construct {
  readonly role: Role;
  readonly fn: Function;
  readonly event: Rule;

  constructor(scope: Construct, id: string, props: EcsEc2ServiceRebalanceProps) {
    super(scope, id);

    const { cluster } = props;

    this.role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        default: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['ecs:*'],
              resources: ['*'],
              conditions: {
                ArnEquals: {
                  'ecs:cluster': cluster.clusterArn,
                },
              },
            }),
          ],
        }),
      },
    });

    this.fn = new Function(this, 'Fn', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(`${__dirname}/handler`),
      handler: 'index.handler',
      role: this.role,
      timeout: Duration.minutes(10),
      environment: {
        CLUSTER: cluster.clusterName,
        TIMEOUT: (2 * 60).toString(),
      },
    });

    this.event = new Rule(this, 'Event', {
      eventPattern: {
        source: ['aws.ecs'],
        detailType: ['ECS Container Instance State Change'],
      },
      targets: [new LambdaFunction(this.fn)],
    });
  }
}
