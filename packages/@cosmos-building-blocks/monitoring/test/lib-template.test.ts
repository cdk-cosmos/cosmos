import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { ClusterDashboard } from '../src';

test('SQS Queue Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack', { env: { region: 'ap-southeast-2' } });
  new ClusterDashboard(stack, 'Dashboard', { cluster: { clusterName: 'Core-Mgt-Dev-Cluster' } as any });
  const synth = SynthUtils.synthesize(stack);
  console.log(synth.template.Resources.DashboardClusterDashboard619DE464.Properties.DashboardBody);
});
