import { getRoutingPriority } from '../src/utils';

test('Should generate routing priority in order of path.', () => {
  expect(getRoutingPriority({})).toBe(20456);
  expect(getRoutingPriority({ pathPattern: '*' })).toBe(20455);
  expect(getRoutingPriority({ pathPattern: 'a' })).toBe(20442);
  expect(getRoutingPriority({ pathPattern: 'A' })).toBe(20416);
  expect(getRoutingPriority({ pathPattern: '0' })).toBe(20390);

  expect(getRoutingPriority({ pathPattern: '?' })).toBeLessThan(getRoutingPriority({ pathPattern: '*' }));
  expect(getRoutingPriority({ pathPattern: 'a' })).toBeLessThan(getRoutingPriority({ pathPattern: '*' }));
  expect(getRoutingPriority({ pathPattern: 'A' })).toBeLessThan(getRoutingPriority({ pathPattern: 'a' }));

  expect(getRoutingPriority({ pathPattern: '/test1' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test' }));
  expect(getRoutingPriority({ pathPattern: '/test/test' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test' }));
  expect(getRoutingPriority({ pathPattern: '/Test' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test' }));

  expect(getRoutingPriority({ pathPattern: '/test2' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test1' }));
  expect(getRoutingPriority({ pathPattern: '/test/v2' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test/v1' }));

  expect(getRoutingPriority({ hostHeader: 'www.google.com' })).toBeLessThan(
    getRoutingPriority({ hostHeader: 'google.com' })
  );

  expect(getRoutingPriority({ hostHeader: 'www.google.com', pathPattern: '/test' })).toBeLessThan(
    getRoutingPriority({ pathPattern: '/*' })
  );
});
