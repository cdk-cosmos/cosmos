import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import '@aws-cdk/core';
import { TgwConnect } from '../src';
import { App, Stack } from '@aws-cdk/core';
import { Vpc, SubnetType } from '@aws-cdk/aws-ec2';

const app = new App();
const testStack = new Stack(app, 'TestStack');
const myvpc = new Vpc(testStack, 'TestVpc', {
  cidr: '10.180.7.0/24',
  maxAzs: 1,
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
const transitGatewayId = 'tgw-0d4180d3e7c919164';
const tgwDestinationCidr = '10.0.0.0/8';
const resolverRuleId = 'rslvr-rr-a5c8a7ee5efb41eab';
new TgwConnect(testStack, 'MyTgwConnection', {
  vpc: myvpc,
  transitGatewayId,
  tgwDestinationCidr,
  resolverRuleId,
});
const testStacksynth = SynthUtils.synthesize(testStack);

describe('Transit Gateway Connection', () => {
  test('should create TGW attachments', () => {
    expect(testStacksynth).toHaveResource('AWS::Route53Resolver::ResolverRuleAssociation');
    expect(testStacksynth).toHaveResource('AWS::EC2::TransitGatewayAttachment');
    expect(testStacksynth).toHaveResource('AWS::EC2::Route');
  });

  test('should not create resolver rule association if prop not passed', () => {
    const app1 = new App();
    const testStack1 = new Stack(app1, 'TestStack1');
    const myvpc = new Vpc(testStack1, 'TestVpc', {
      cidr: '10.180.7.0/24',
      maxAzs: 1,
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
    new TgwConnect(testStack1, 'MyTgwConnection1', {
      vpc: myvpc,
      transitGatewayId,
      tgwDestinationCidr,
    });
    const testStack1synth = SynthUtils.synthesize(testStack1);
    expect(testStack1synth).not.toHaveResource('AWS::Route53Resolver::ResolverRuleAssociation');
    expect(testStack1synth).toHaveResource('AWS::EC2::TransitGatewayAttachment');
    expect(testStack1synth).toHaveResource('AWS::EC2::Route');
  });

  test('should match snapshot', () => {
    expect(testStacksynth.template).toMatchSnapshot();
  });
});
