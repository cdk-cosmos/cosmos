import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-codecommit';
import { NodePipeline, DockerPipeline, CdkPipeline } from '../src';

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
    });

    cdk.addDeployStackStage({ name: 'TestStage', stacks: [stack2] });

    // Should be able to add stacks after CdkPipeline
    new Stack(app, 'Test3');

    const synth = SynthUtils.synthesize(stack);

    expect(cdk.pipeline.stages).toHaveLength(4);
    expect(synth.template).toMatchSnapshot();
  });

  test('cdk pipeline should support stack dependent deployments', () => {
    const app = new App();
    const stack = new Stack(app, 'Test');
    const stack2 = new Stack(app, 'Test2');

    const repo = new Repository(stack, 'Repo', {
      repositoryName: 'repo',
    });

    const cdk = new CdkPipeline(stack, 'Pipeline', {
      cdkRepo: repo,
    });

    cdk.addDeployStackStage({ name: 'TestStage', stacks: [stack2] });

    // Should be able to add stacks after CdkPipeline
    const stack3 = new Stack(app, 'Test3');
    stack3.addDependency(stack2);
    const stack4 = new Stack(app, 'Test4');
    stack4.node.addDependency(stack3);

    const synth = SynthUtils.synthesize(stack);

    expect(cdk.pipeline.stages).toHaveLength(5);
    expect(synth.template).toMatchSnapshot();
  });
});
