import { getRoutingPriorityFromListenerProps, getRoutingPriority } from '../src/utils';
import { ListenerCondition } from '@aws-cdk/aws-elasticloadbalancingv2';

test('Should generate routing priority in order of path.', () => {
  expect(getRoutingPriority({})).toBe(20456);
  expect(getRoutingPriority({ path: '*' })).toBe(20455);
  expect(getRoutingPriority({ path: 'a' })).toBe(20442);
  expect(getRoutingPriority({ path: 'A' })).toBe(20416);
  expect(getRoutingPriority({ path: '0' })).toBe(20390);

  expect(getRoutingPriority({ path: '?' })).toBeLessThan(getRoutingPriority({ path: '*' }));
  expect(getRoutingPriority({ path: 'a' })).toBeLessThan(getRoutingPriority({ path: '*' }));
  expect(getRoutingPriority({ path: 'A' })).toBeLessThan(getRoutingPriority({ path: 'a' }));

  expect(getRoutingPriority({ path: '/test1' })).toBeLessThan(getRoutingPriority({ path: '/test' }));
  expect(getRoutingPriority({ path: '/test/test' })).toBeLessThan(getRoutingPriority({ path: '/test' }));
  expect(getRoutingPriority({ path: '/Test' })).toBeLessThan(getRoutingPriority({ path: '/test' }));

  expect(getRoutingPriority({ path: '/test2' })).toBeLessThan(getRoutingPriority({ path: '/test1' }));
  expect(getRoutingPriority({ path: '/test/v2' })).toBeLessThan(getRoutingPriority({ path: '/test/v1' }));

  expect(getRoutingPriority({ host: 'www.google.com' })).toBeLessThan(getRoutingPriority({ host: 'google.com' }));

  expect(getRoutingPriority({ host: 'www.google.com', path: '/test' })).toBeLessThan(
    getRoutingPriority({ path: '/*' })
  );
});

test('Should test routing conditions', () => {
  expect(
    getRoutingPriorityFromListenerProps({
      conditions: [ListenerCondition.hostHeaders(['host'])],
    })
  ).toEqual(getRoutingPriority({ host: 'host' }));

  expect(
    getRoutingPriorityFromListenerProps({
      conditions: [ListenerCondition.pathPatterns(['path'])],
    })
  ).toEqual(getRoutingPriority({ path: 'path' }));

  expect(
    getRoutingPriorityFromListenerProps({
      conditions: [ListenerCondition.hostHeaders(['host']), ListenerCondition.pathPatterns(['path'])],
    })
  ).toEqual(getRoutingPriority({ host: 'host', path: 'path' }));
});
