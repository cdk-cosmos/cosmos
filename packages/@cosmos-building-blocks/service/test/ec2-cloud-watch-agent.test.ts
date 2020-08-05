import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Vpc, Instance, InstanceType, MachineImage } from '@aws-cdk/aws-ec2';
import { CloudWatchAgent } from '../src';

const app = new App();
const stack = new Stack(app, 'Stack', { env: { region: 'region' } });
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
  compute: instance,
});

const synth = SynthUtils.toCloudFormation(stack);

test('Cloud Watch Agent', () => {
  const userData = stack.resolve(instance.userData.render());
  expect(userData).toContain('rpm');
  expect(userData).toContain('echo');
  expect(userData).toContain('amazon-cloudwatch-agent-ctl');
  expect(userData).toContain('mem_used_percent');
  expect(userData).toContain('used_percent');
  expect(userData).toMatchSnapshot();
});

test('Cloud Watch Agent Snapshot', () => {
  expect(synth).toMatchSnapshot();
});

test('Cloud Watch Agent with ASG', () => {
  const app = new App();
  const stack = new Stack(app, 'Stack', { env: { region: 'region' } });
  const asg = new AutoScalingGroup(stack, 'Instance', {
    vpc: Vpc.fromVpcAttributes(stack, 'Vpc', {
      vpcId: 'Vpc',
      availabilityZones: ['a'],
      isolatedSubnetIds: ['a-sub-1'],
    }),
    instanceType: new InstanceType('t3.nano'),
    machineImage: MachineImage.latestAmazonLinux(),
  });
  new CloudWatchAgent(stack, 'CloudWatchAgent', {
    compute: asg,
  });

  const synth = SynthUtils.toCloudFormation(stack);

  expect(synth).toMatchSnapshot();
});
