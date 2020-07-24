/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

// Mocking modules
class MockCloudFormation {
  listExports = () => ({
    promise: () =>
      Promise.resolve({
        $response: {},
        Exports: [
          {
            Name: 'test',
            Value: 'test',
          },
        ],
      }),
  });
}

jest.mock('aws-sdk', () => ({ CloudFormation: MockCloudFormation }));

// Silence logging
console.log = jest.fn();
console.error = jest.fn();

// Tests
import { handler } from '../src/cross-account-handler';

beforeEach(() => {
  jest.clearAllMocks();
});

test('should succeeded when valid event', async () => {
  const event: any = {
    ResponseURL: 'https://test/',
    ResourceProperties: { exports: ['test', 'test2'] },
  };

  const result = await handler(event);
  expect(result).toMatchObject({
    Data: { test: 'test', test2: '' },
  });

  event.ResourceProperties.shouldErrorIfNotFound = true;
  try {
    await handler(event);
  } catch (error) {
    expect(error.message).toEqual('Export test2 not found.');
  }
});

test('should fail when invalid event', async () => {
  const event: any = {
    ResponseURL: 'https://test/',
    ResourceProperties: {},
  };

  try {
    await handler(event);
  } catch (error) {
    expect(error.message).toEqual('exports is not iterable');
  }

  try {
    await handler({} as any);
  } catch (error) {
    expect(error.message).toContain('Cannot destructure property');
  }
});
