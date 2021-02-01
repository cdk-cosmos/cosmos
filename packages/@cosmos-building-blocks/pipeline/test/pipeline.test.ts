import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-codecommit';
import { NodePipeline, DockerPipeline, CdkPipeline } from '../src';
import { GithubEnterpriseConnection, GithubEnterpriseSourceProvider } from '../src/source';
import { GithubEnterpriseHost } from '../src/source/github-enterprise-connection';
import { Vpc } from '@aws-cdk/aws-ec2';

describe('Node Pipeline', () => {
  const app = new App();
  const stack = new Stack(app, 'Test');
  const repo = new Repository(stack, 'Repo', {
    repositoryName: 'repo',
  });

  new NodePipeline(stack, 'Pipeline', {
    codeRepo: repo,
    buildSpec: NodePipeline.DefaultBuildSpec(),
  });

  const synth = SynthUtils.synthesize(stack);

  test('should match snapshot', () => {
    expect(synth.template).toMatchSnapshot();
  });
});

describe('Docker Pipeline', () => {
  const app = new App();
  const stack = new Stack(app, 'Test');
  const repo = new Repository(stack, 'Repo', {
    repositoryName: 'repo',
  });
  new DockerPipeline(stack, 'Pipeline', {
    codeRepo: repo,
    buildSpec: DockerPipeline.DefaultBuildSpec(),
  });

  const synth = SynthUtils.synthesize(stack);

  test('should match snapshot', () => {
    expect(synth.template).toMatchSnapshot();
  });
});

describe('Cdk Pipeline', () => {
  const app = new App();
  const stack = new Stack(app, 'Test');
  const repo = new Repository(stack, 'Repo', {
    repositoryName: 'repo',
  });

  const cdk = new CdkPipeline(stack, 'Pipeline', {
    cdkRepo: repo,
  });

  const synth = SynthUtils.synthesize(stack);

  test('should match snapshot', () => {
    expect(cdk.pipeline.stages).toHaveLength(3);
    expect(synth.template).toMatchSnapshot();
  });

  test('cdk pipeline should support multiple stage deployments', () => {
    const app = new App();
    const stack = new Stack(app, 'Test');
    const stack2 = new Stack(app, 'Test2');

    const repo = new Repository(stack, 'Repo', {
      repositoryName: 'repo',
    });

    const cdk = new CdkPipeline(stack, 'Pipeline', {
      cdkRepo: repo,
      cdkWorkingDir: 'test',
      npmKey: 'test',
    });

    cdk.addDeployStackStage({ name: 'TestStage', stacks: [stack2] });

    // Should be able to add stacks after CdkPipeline
    new Stack(app, 'Test3');

    const synth = SynthUtils.synthesize(stack);

    expect(cdk.pipeline.stages).toHaveLength(4);
    expect(synth.template).toMatchSnapshot();
  });
});

describe('Github Enterprise', () => {
  const app = new App();
  const stack = new Stack(app, 'Test');

  const repo = 'https://ghe.com/timpur/test.git';
  const host = new GithubEnterpriseHost(stack, 'GHEHost', {
    hostName: 'GHEHost',
    vpc: Vpc.fromVpcAttributes(stack, 'Vpc', {
      vpcId: '123',
      availabilityZones: ['a'],
      isolatedSubnetNames: ['App'],
      isolatedSubnetIds: ['123'],
      isolatedSubnetRouteTableIds: ['123'],
    }),
    subnets: [{ subnetGroupName: 'App' }],
    endpoint: 'https://ghe.com/',
  });
  const connection = new GithubEnterpriseConnection(stack, 'GHE', {
    connectionName: 'GHE',
    host: host,
  });

  new CdkPipeline(stack, 'Pipeline', {
    cdkSource: new GithubEnterpriseSourceProvider({ connection, repo, branch: 'master' }),
  });

  const synth = SynthUtils.synthesize(stack);

  expect(synth.template).toMatchSnapshot();
});
