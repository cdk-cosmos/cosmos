import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
import { SynthUtils } from '@aws-cdk/assert';
import { Code } from '@aws-cdk/aws-lambda';
import { CrossAccountExports, CrossAccountExportsFn } from '../src';

const app = new App();
const stack = new Stack(app, 'TestStack');
const fn = new CrossAccountExportsFn(stack, 'CrossAccountExportsFn', {
  code: Code.fromAsset(`${__dirname}/../lib/cross-account-stack-ref-handler.zip`),
});
const exp = new CrossAccountExports(stack, 'TestExports', {
  exports: ['Test-Export'],
  fn,
});
const synth = SynthUtils.synthesize(stack);

test('should have a custom resource and a lambda fn', () => {
  expect(synth).toHaveResource('Custom::CrossAccountExports', {
    Exports: ['Test-Export'],
  });
  expect(exp.get('Test-Export')).toContain('Token');
  expect(exp.get(['Test-Export'])).toHaveLength(1);
  expect(exp.get()).toHaveLength(1);
});

test('should be able to find fn in stack scope', () => {
  expect(
    () =>
      new CrossAccountExports(stack, 'TestExports2', {
        exports: ['Test-Export'],
        alwaysUpdate: true,
      })
  ).not.toThrow();
});
