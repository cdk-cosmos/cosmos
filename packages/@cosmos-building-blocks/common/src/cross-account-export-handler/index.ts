import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';
import { CloudFormation, ChainableTemporaryCredentials } from 'aws-sdk';
import { AssumeRoleRequest } from 'aws-sdk/clients/sts';

interface Props {
  exports: string[];
  shouldErrorIfNotFound?: boolean;
  assumeRoleArn?: string;
}

interface Attributes {
  [key: string]: string | undefined;
}

export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<Partial<CloudFormationCustomResourceResponse> | undefined> => {
  const { exports, shouldErrorIfNotFound, assumeRoleArn } = (event.ResourceProperties as any) as Props;
  const attributes: Attributes = {};

  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.RequestType === 'Delete') return;

  const credential = assumeRoleArn
    ? await GetCredential({ RoleArn: assumeRoleArn, RoleSessionName: 'cross-account-stack-ref-handler' })
    : undefined;
  const cloudformation = new CloudFormation({ credentials: credential });

  const req = await cloudformation.listExports().promise();
  if (req.$response.error) throw req.$response.error;

  for (const exp of exports) {
    const ref = req.Exports?.find(x => x.Name === exp);
    if (!ref && shouldErrorIfNotFound) throw new Error(`Export ${exp} not found.`);
    attributes[exp] = ref?.Value || '';
  }

  const result = {
    Data: attributes,
  };
  console.log('Response:', JSON.stringify(result, null, 2));
  return result;
};

const GetCredential = (props: AssumeRoleRequest): Promise<ChainableTemporaryCredentials> =>
  new Promise<ChainableTemporaryCredentials>((res, rej) => {
    const credential = new ChainableTemporaryCredentials({
      params: props,
    });
    credential.get(error => {
      if (error) rej(error);
      res(credential);
    });
  });
