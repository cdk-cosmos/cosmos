import { App, Stack } from '@aws-cdk/core';
import { SynthUtils, expect as cdkExpect, countResources, haveResource } from '@aws-cdk/assert';
import { Role, AnyPrincipal } from '@aws-cdk/aws-iam';
import { CrossAccountExports, createCrossAccountExportProvider } from '../src';

jest.mock('fs', () => ({
  ...jest.requireActual<object>('fs'),
  copyFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
}));

const app = new App();
const stack = new Stack(app, 'TestStack');
const exp = new CrossAccountExports(stack, 'TestExports', {
  exports: ['Test-Export'],
  serviceToken: createCrossAccountExportProvider(
    stack,
    new Role(stack, 'TestRoleARN', { assumedBy: new AnyPrincipal() })
  ),
});
const exp2 = new CrossAccountExports(stack, 'TestExports2', { exports: [] });
const exp3 = new CrossAccountExports(stack, 'TestExports3', { exports: [], alwaysUpdate: true });
const synth = SynthUtils.synthesize(stack);

test('should have a custom resource and a lambda fn', () => {
  cdkExpect(synth).to(haveResource('Custom::CrossAccountExports', { exports: ['Test-Export'] }));
  cdkExpect(synth).to(countResources('Custom::CrossAccountExports', 3));
  cdkExpect(synth).to(countResources('AWS::Lambda::Function', 1));
  expect(exp.get('Test-Export')).toContain('Token');
  expect(exp.get(['Test-Export'])).toHaveLength(1);
  expect(exp.get()).toHaveLength(1);
});

test('should be able to find provider in stack scope', () => {
  expect(exp.serviceToken).toEqual(exp2.serviceToken);
  expect(exp2.serviceToken).toEqual(exp3.serviceToken);
});

test('should match snapshot', () => {
  expect(synth.template).toMatchSnapshot();
});
