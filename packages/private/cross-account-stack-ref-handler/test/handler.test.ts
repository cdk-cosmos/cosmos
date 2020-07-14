/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

// Mocking modules
class MockCloudFormation {
  listExports = () => ({
    promise: () =>
      Promise.resolve({
        Exports: [
          {
            Name: 'test',
            Value: 'test',
          },
        ],
      }),
  });
}

const request = jest.fn();
const mockRequest = () => ({
  request: jest.fn((options: any, cb: any) => {
    let body: any;
    return {
      on: jest.fn(),
      write: jest.fn(arg => (body = JSON.parse(arg))),
      end: jest.fn(() => {
        request(body);
        Promise.resolve().then(() => cb({ statusCode: 200, statusMessage: 'Mock' }));
      }),
    };
  }),
});

jest.mock('https', () => mockRequest());
jest.mock('aws-sdk', () => ({ CloudFormation: MockCloudFormation }));

// Silence logging
console.log = jest.fn();
console.error = jest.fn();

// Tests
import { handler } from '../src';

beforeEach(() => {
  jest.clearAllMocks();
});

test('should successfully send response', async () => {
  const event: any = {
    ResponseURL: 'https://test/',
    ResourceProperties: { Exports: ['test', 'test2'] },
  };
  const context: any = {};

  await handler(event, context);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).lastCalledWith({
    Status: 'SUCCESS',
    Reason: 'See the details in CloudWatch Log Stream: undefined',
    Data: { test: 'test', test2: '' },
  });

  event.ResourceProperties.ShouldErrorIfNotFound = true;
  await handler(event, context);
  expect(request).toHaveBeenCalledTimes(2);
  expect(request).lastCalledWith({
    Status: 'FAILED',
    Reason: 'Error: Export test2 not found.\nSee the details in CloudWatch Log Stream: undefined',
  });
});

test('should fail to send response', async () => {
  const event: any = {
    ResponseURL: 'https://test/',
    ResourceProperties: {},
  };
  const context: any = {};

  await handler(event, context);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).lastCalledWith({
    Status: 'FAILED',
    Reason: 'Error: Exports is not iterable\nSee the details in CloudWatch Log Stream: undefined',
  });

  await handler({} as any, context);
  expect(request).toHaveBeenCalledTimes(1);
});
