import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-codecommit';
import { NodePipeline, DockerPipeline } from '../src';

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
