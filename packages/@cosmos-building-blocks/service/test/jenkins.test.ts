import { SynthUtils, expect as cdkExpect, ABSENT, arrayWith, objectLike } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import * as jenkins from '../src/index';
import { ListenerCondition, ApplicationListener, ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Vpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Cluster } from '@aws-cdk/aws-ecs';
import { HostedZone } from '@aws-cdk/aws-route53';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-jenkins');
const vpc = Vpc.fromVpcAttributes(stack, 'vpc', {
  vpcId: 'vpcIdxxx',
  availabilityZones: ['availabilityZoneA'],
  isolatedSubnetIds: ['isolatedSubnetId'],
});
const cluster = Cluster.fromClusterAttributes(stack, 'cluster', {
  clusterArn: 'clusterArnxxx',
  clusterName: 'clusterName',
  vpc,
  securityGroups: [SecurityGroup.fromSecurityGroupId(stack, 'clusterSecurityGroup', 'clusterSecurityGroupId')],
});
const httpsListener = ApplicationListener.fromApplicationListenerAttributes(stack, 'httpListener', {
  listenerArn: 'listenerArnxxx',
  securityGroup: SecurityGroup.fromSecurityGroupId(stack, 'listenerSecurityGroup', 'listenerSecurityGroupId'),
});
const zone = HostedZone.fromHostedZoneAttributes(stack, 'zone', {
  hostedZoneId: 'hostedZoneIdxxx',
  zoneName: 'zoneName',
});

const alb = ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(stack, 'alb', {
  loadBalancerArn: 'albArnxxx',
  securityGroupId: 'albSecurityGroupId',
  loadBalancerCanonicalHostedZoneId: 'hostedZoneIdxxx',
  loadBalancerDnsName: 'dnsName',
});

/* add in jenkins worker */
const jenkinsWorker = new jenkins.JenkinsWorker(stack, 'JenkinsWorker', {
  vpc,
  cluster,
  envs: {
    HTTP_PROXY: 'http://proxy',
  },
});

/* add in jenkins master */
const recordName = 'jenkins';
new jenkins.JenkinsMaster(stack, 'JenkinsMaster', {
  vpc,
  cluster,
  listener: httpsListener,
  worker: jenkinsWorker,
  targetGroupProps: {
    healthCheck: {
      path: '/',
      healthyHttpCodes: '200',
    },
  },
  hostBasedRouting: {
    alb,
    recordName,
    zone,
  },
  backupPlan: true,
  routingProps: {
    conditions: [ListenerCondition.hostHeaders([`${recordName}.${zone.zoneName}`])],
  },
});

describe('Jenkins', () => {
  test('should match snapshot', () => {
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});

describe('Jenkins master', () => {
  test('should have a security group', () => {
    expect(stack).toHaveResource('AWS::EC2::SecurityGroup', {
      GroupDescription: 'aws-jenkins/JenkinsMaster/Service/SecurityGroup',
    });
  });
  test('should have a efs', () => {
    expect(stack).toHaveResource('AWS::EFS::FileSystem', {});
  });
  test('should have a ecs service', () => {
    expect(stack).toHaveResource('AWS::ECS::Service', {});
  });
  test('should have port 8080 open', () => {
    expect(stack).toHaveResourceLike('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          PortMappings: [
            {
              ContainerPort: 8080,
              Protocol: 'tcp',
            },
          ],
        },
      ],
    });
    // expect security group 8080 open
    expect(stack).toHaveResource('AWS::EC2::SecurityGroupIngress', {
      ToPort: 8080,
    });
  });
  test('should have port 50000 open', () => {
    // expect security group 8080 open
    expect(stack).toHaveResource('AWS::EC2::SecurityGroupIngress', {
      ToPort: 50000,
    });
  });
  test('should have permission to run jenkins agent task', () => {
    expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: arrayWith(
          objectLike({
            Action: 'ecs:RunTask',
          })
        ),
      },
    });
  });
  test('should have permission to stop jenkins agent task', () => {
    expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: arrayWith(
          objectLike({
            Action: 'ecs:StopTask',
            Condition: {
              'ForAnyValue:ArnEquals': {
                'ecs:cluster': 'clusterArnxxx',
              },
            },
          })
        ),
      },
    });
  });
});

describe('Host based routing alb', () => {
  test('should have A record', () => {
    // THEN
    // should have A record
    expect(stack).toHaveResourceLike('AWS::Route53::RecordSet', {
      AliasTarget: {
        DNSName: 'dualstack.dnsName',
        HostedZoneId: 'hostedZoneIdxxx',
      },
      HostedZoneId: 'hostedZoneIdxxx',
      Name: 'jenkins.zoneName.',
      Type: 'A',
    });
  });
  test('should have condition for host based routing', () => {
    expect(stack).toHaveResource('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Conditions: [
        {
          Field: 'host-header',
          HostHeaderConfig: {
            Values: ['jenkins.zoneName'],
          },
        },
      ],
    });
  });
});

describe('Jenkins master filesystem', () => {
  test('should have a backup plan if enable', () => {
    expect(stack).toHaveResource('AWS::Backup::BackupPlan', {
      BackupPlan: objectLike({
        BackupPlanName: 'JenkinsPlan',
      }),
    });
  });
});

describe('Jenkins agent', () => {
  test('should have a task def', () => {
    expect(stack).toHaveResource('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: arrayWith(objectLike({ Name: 'Agent' })),
    });
  });
  test('should allow environment variable changes', () => {
    expect(stack).toHaveResource('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: arrayWith(
        objectLike({
          Environment: [
            {
              Name: 'HTTP_PROXY',
              Value: 'http://proxy',
            },
          ],
        })
      ),
    });
  });
});
