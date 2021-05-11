import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { App, Stack } from '@aws-cdk/core';
import { SsmState } from '../src';

const app = new App();
const stack = new Stack(app, 'Stack');
const state = new SsmState(stack, 'SsmState', {
  name: 'SsmState',
  value: 'new',
});
const state2 = new SsmState(stack, 'SsmState2', {
  name: 'SsmState2',
});

const synth = SynthUtils.toCloudFormation(stack);

test('SSM State', () => {
  expect(state.value).toEqual('${Token[TOKEN.13]}');
  expect(state2.value).toEqual('${Token[TOKEN.20]}');
  expect(synth).toMatchSnapshot();
});
