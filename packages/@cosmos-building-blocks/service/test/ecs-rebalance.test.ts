import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Cluster } from '@aws-cdk/aws-ecs';
import { Vpc } from '@aws-cdk/aws-ec2';
import { EcsEc2ServiceRebalance } from '../src';

const app = new App();
const stack = new Stack(app, 'Stack');
const cluster = Cluster.fromClusterAttributes(stack, 'Cluster', {
  clusterName: 'Test',
  vpc: Vpc.fromVpcAttributes(stack, 'Vpc', {
    vpcId: 'vpc-1234',
    availabilityZones: ['AZ1'],
  }),
  securityGroups: [],
});
new EcsEc2ServiceRebalance(stack, 'Rebalance', {
  cluster,
});

const synth = SynthUtils.toCloudFormation(stack);

test('Ecs Rebalance Snapshot', () => {
  expect(synth).toMatchSnapshot();
});

test('return if event is not for cluster', async () => {
  const oldEnvs = process.env;
  process.env.CLUSTER = 'CoreDevTestCluster';
  process.env.TIMEOUT = '300';

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const handleRebalance = require('../src/ecs/ecs-rebalance/handler').handler;

  const event = {
    id: 'c6f05608-31e9-60c3-0972-4715b3702aaa',
    'detail-type': 'ECS Container Instance State Change',
    source: 'aws.ecs',
    resources: [
      'arn:aws:ecs:ap-southeast-2:0000000000:container-instance/CoreDevDevCluster/abcdefghijklmnopqrstuvwxyz',
    ],
    detail: {
      agentConnected: true,
      clusterArn: 'arn:aws:ecs:ap-southeast-2:0000000000:cluster/CoreDevDevCluster',
      containerInstanceArn:
        'arn:aws:ecs:ap-southeast-2:0000000000:container-instance/CoreDevDevCluster/abcdefghijklmnopqrstuvwxyz',
      ec2InstanceId: 'i-05a75a0ab86a66a90',
      status: 'ACTIVE',
      pendingTasksCount: 1,
      runningTasksCount: 7,
    },
  };
  const spy = jest.spyOn(console, 'log');
  await handleRebalance(event);
  expect(spy).toHaveBeenCalledWith('Event is not for CoreDevTestCluster');
  process.env = oldEnvs;
});
