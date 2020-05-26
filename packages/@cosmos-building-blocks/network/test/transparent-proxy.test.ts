import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Vpc, SubnetType } from '@aws-cdk/aws-ec2';
import { TransparentProxy } from '../src';

const app = new App();
const stack = new Stack(app, 'Test');
const vpc = new Vpc(stack, 'VPC', {
  cidr: '10.180.7.0/24',
  maxAzs: 2,
  subnetConfiguration: [
    {
      name: 'Main',
      subnetType: SubnetType.ISOLATED,
      cidrMask: 26,
    },
    {
      name: 'Redis',
      subnetType: SubnetType.ISOLATED,
      cidrMask: 28,
    },
  ],
});

new TransparentProxy(stack, 'TransparentProxy', {
  vpc: vpc,
  vpcSubnets: { subnetGroupName: 'Main' },
  host: 'proxy.internal',
  port: 8080,
  initialInstanceId: 'in-1234',
});

const synth = SynthUtils.synthesize(stack);

describe('Transparent Proxy', () => {
  test('should match snapshot', () => {
    expect(synth.template).toMatchSnapshot();
  });
});
