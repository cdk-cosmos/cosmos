import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
import { SynthUtils, expect as cdkExpect, countResources } from '@aws-cdk/assert';
import { Code } from '@aws-cdk/aws-lambda';
import { CrossAccountExports, CrossAccountExportsFn } from '../src';
import { Role, AnyPrincipal } from '@aws-cdk/aws-iam';

const app = new App();
const stack = new Stack(app, 'TestStack');
const exp = new CrossAccountExports(stack, 'TestExports', {
  exports: ['Test-Export'],
  fn: new CrossAccountExportsFn(stack, 'CustomFn', {
    code: Code.fromAsset(`${__dirname}/../lib/cross-account-stack-ref-handler.zip`),
    role: new Role(stack, 'TestRoleARN', { assumedBy: new AnyPrincipal() }),
  }),
});
const exp2 = new CrossAccountExports(stack, 'TestExports2', { exports: [] });
const exp3 = new CrossAccountExports(stack, 'TestExports3', { exports: [], alwaysUpdate: true });
const synth = SynthUtils.synthesize(stack);

test('should have a custom resource and a lambda fn', () => {
  expect(synth).toHaveResource('Custom::CrossAccountExports', {
    Exports: ['Test-Export'],
  });
  cdkExpect(synth).to(countResources('Custom::CrossAccountExports', 3));
  cdkExpect(synth).to(countResources('AWS::Lambda::Function', 2));
  expect(exp.get('Test-Export')).toContain('Token');
  expect(exp.get(['Test-Export'])).toHaveLength(1);
  expect(exp.get()).toHaveLength(1);
});

test('should be able to find fn in stack scope', () => {
  expect(exp.fn).not.toEqual(exp2.fn);
  expect(exp2.fn).toEqual(exp3.fn);
});

test('should match snapshot', () => {
  expect(synth.template).toMatchSnapshot();
});
