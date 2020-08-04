import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { CloudWatchAgent } from '../src';
import { Instance, Vpc, InstanceType, MachineImage } from '@aws-cdk/aws-ec2';

const app = new App();
const stack = new Stack(app, 'Stack');
const instance = new Instance(stack, 'Instance', {
  vpc: Vpc.fromVpcAttributes(stack, 'Vpc', {
    vpcId: 'Vpc',
    availabilityZones: ['a'],
    isolatedSubnetIds: ['a-sub-1'],
  }),
  instanceType: new InstanceType('t3.nano'),
  machineImage: MachineImage.latestAmazonLinux(),
});
new CloudWatchAgent(stack, 'CloudWatchAgent', {
  instance,
});

const synth = SynthUtils.toCloudFormation(stack);

test('Cloud Watch Agent', () => {
  expect(synth).toMatchSnapshot();
});