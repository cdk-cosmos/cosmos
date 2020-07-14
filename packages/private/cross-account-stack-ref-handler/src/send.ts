import { request } from 'https';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { Context, CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';

const sendRequest = async (url: string, body: object): Promise<IncomingMessage> => {
  const parsedUrl = parse(url);
  const responseBody = JSON.stringify(body);
  return new Promise<IncomingMessage>((resolve, reject): void => {
    const req = request(
      {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'content-length': responseBody.length,
        },
      },
      response => resolve(response)
    );
    req.on('error', error => reject(error));
    req.write(responseBody);
    req.end();
  });
};

export const send = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
  status: 'SUCCESS' | 'FAILED',
  attributes?: object,
  physicalResourceId?: string,
  error?: Error
): Promise<void> => {
  try {
    const url = event.ResponseURL;
    let reason = error ? `Error: ${error.message}\n` : '';
    reason += `See the details in CloudWatch Log Stream: ${context.logStreamName}`;
    const data: CloudFormationCustomResourceResponse = {
      Status: status,
      Reason: reason,
      PhysicalResourceId: physicalResourceId || context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: attributes,
    };
    console.log('Sending Response:', url, data);
    const response = await sendRequest(url, data);
    console.log(`Status code: ${response.statusCode} Status message: ${response.statusMessage}`);
  } catch (error) {
    console.error('send() failed executing https.request(): ' + error);
  }
};
