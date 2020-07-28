import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { EcsService } from '../src';
import { Cluster, ContainerImage } from '@aws-cdk/aws-ecs';
import { Vpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import { ApplicationListener } from '@aws-cdk/aws-elasticloadbalancingv2';

const app = new App();
const stack = new Stack(app, 'Stack');
const vpc = Vpc.fromVpcAttributes(stack, 'Vpc', {
  vpcId: 'Vpc',
  availabilityZones: ['a'],
  isolatedSubnetIds: ['a-sub-1'],
});
const cluster = Cluster.fromClusterAttributes(stack, 'Cluster', {
  clusterName: 'Cluster',
  securityGroups: [SecurityGroup.fromSecurityGroupId(stack, 'SecurityGroup', 'SecurityGroup')],
  vpc,
});
const listener = ApplicationListener.fromApplicationListenerAttributes(stack, 'Listener', {
  listenerArn: 'Listener',
  securityGroup: cluster.connections.securityGroups[0],
});
new EcsService(stack, 'EcsService', {
  cluster,
  vpc,
  httpListener: listener,
  containerProps: {
    image: ContainerImage.fromRegistry('Image'),
  },
  routingProps: { pathPattern: '/path' },
});

const synth = SynthUtils.toCloudFormation(stack);

test('Ecs Service', () => {
  expect(synth).toMatchSnapshot();
});
