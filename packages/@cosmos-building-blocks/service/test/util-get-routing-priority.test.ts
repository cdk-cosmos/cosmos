import { getRoutingPriority } from '../src/utils';

test('Should generate routing priority in order of path.', () => {
  expect(getRoutingPriority({})).toBe(5000);
  expect(getRoutingPriority({ pathPattern: '*' })).toBe(5000);
  expect(getRoutingPriority({ pathPattern: 'a' })).toBe(4996);
  expect(getRoutingPriority({ pathPattern: 'A' })).toBe(4989);
  expect(getRoutingPriority({ pathPattern: '0' })).toBe(4983);

  expect(getRoutingPriority({ pathPattern: '?' })).toBeLessThan(getRoutingPriority({ pathPattern: '*' }));
  expect(getRoutingPriority({ pathPattern: 'a' })).toBeLessThan(getRoutingPriority({ pathPattern: '*' }));
  expect(getRoutingPriority({ pathPattern: 'A' })).toBeLessThan(getRoutingPriority({ pathPattern: 'a' }));

  expect(getRoutingPriority({ pathPattern: '/test1' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test' }));
  expect(getRoutingPriority({ pathPattern: '/test/test' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test' }));
  expect(getRoutingPriority({ pathPattern: '/Test' })).toBeLessThan(getRoutingPriority({ pathPattern: '/test' }));

  expect(getRoutingPriority({ hostHeader: 'www.google.com' })).toBeLessThan(
    getRoutingPriority({ hostHeader: 'google.com' })
  );

  expect(getRoutingPriority({ hostHeader: 'www.google.com', pathPattern: '/test' })).toBeLessThan(
    getRoutingPriority({ pathPattern: '/*' })
  );
});
