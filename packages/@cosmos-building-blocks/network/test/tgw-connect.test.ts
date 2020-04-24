import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Vpc, SubnetType } from '@aws-cdk/aws-ec2';
import { TransitGateway, ResolverRule } from '../src';

const app = new App();
const testStack = new Stack(app, 'TestStack');
const myvpc = new Vpc(testStack, 'TestVpc', {
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

const gateway = TransitGateway.fromGatewayAttributes(testStack, 'TransitGateway', {
  gatewayId: 'tgw-1234',
});
const attachment = gateway.addAttachment('TransitGatewayAttachment', {
  vpc: myvpc,
  subnets: [{ subnetGroupName: 'Main' }],
});
attachment.addRoute('TGWRoute', { destinationCidrBlock: '10.0.0.0/8' });

const resolver = ResolverRule.fromResolverAttributes(testStack, 'ResolverRule', {
  ruleId: 'rslvr-rr-1234',
});
resolver.addAssociation('ResolverRuleAssociation', {
  vpc: myvpc,
});

const testStacksynth = SynthUtils.synthesize(testStack);

describe('Transit Gateway Connection', () => {
  test('should create TGW attachments', () => {
    expect(testStacksynth).toHaveResource('AWS::Route53Resolver::ResolverRuleAssociation');
    expect(testStacksynth).toHaveResource('AWS::EC2::TransitGatewayAttachment');
    expect(testStacksynth).toHaveResource('AWS::EC2::Route');
  });

  test('should match snapshot', () => {
    expect(testStacksynth.template).toMatchSnapshot();
  });
});
