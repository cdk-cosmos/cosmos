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
