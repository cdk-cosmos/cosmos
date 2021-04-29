import { getRoutingPriorityFromListenerProps, getRoutingPriority } from '../src/ecs';
import { ListenerCondition } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Stack } from '@aws-cdk/core';

test('Should generate routing priority in order of path.', () => {
  expect(getRoutingPriority([])).toBe(50000);

  expect(getRoutingPriority(['?'])).toBeLessThan(getRoutingPriority(['*']));
  expect(getRoutingPriority(['a'])).toBeLessThan(getRoutingPriority(['*']));
  expect(getRoutingPriority(['A'])).toBeLessThan(getRoutingPriority(['a']));

  expect(getRoutingPriority(['/test1'])).toBeLessThan(getRoutingPriority(['/test']));
  expect(getRoutingPriority(['/test/test'])).toBeLessThan(getRoutingPriority(['/test']));
  expect(getRoutingPriority(['/Test'])).toBeLessThan(getRoutingPriority(['/test']));

  expect(getRoutingPriority(['/test2'])).toBeLessThan(getRoutingPriority(['/test1']));
  expect(getRoutingPriority(['/test/v2'])).toBeLessThan(getRoutingPriority(['/test/v1']));

  expect(getRoutingPriority(['www.google.com'])).toBeLessThan(getRoutingPriority(['google.com']));

  expect(getRoutingPriority(['www.google.com', '/test'])).toBeLessThan(getRoutingPriority(['/*']));

  expect(getRoutingPriority(['www.google.com', '/test', '/test2'])).toBeLessThan(
    getRoutingPriority(['www.google.com', '/test'])
  );
});

test('Should test routing conditions', () => {
  const stack = new Stack();
  expect(
    getRoutingPriorityFromListenerProps(stack, {
      conditions: [ListenerCondition.hostHeaders(['host'])],
    })
  ).toEqual(getRoutingPriority(['host']));

  expect(
    getRoutingPriorityFromListenerProps(stack, {
      conditions: [ListenerCondition.pathPatterns(['path'])],
    })
  ).toEqual(getRoutingPriority(['path']));

  expect(
    getRoutingPriorityFromListenerProps(stack, {
      conditions: [ListenerCondition.hostHeaders(['host']), ListenerCondition.pathPatterns(['path'])],
    })
  ).toEqual(getRoutingPriority(['host', 'path']));
});
