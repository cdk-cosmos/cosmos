import 'source-map-support/register';
import { Context, CloudFormationCustomResourceEvent } from 'aws-lambda';
import { Credentials, CloudFormation, ChainableTemporaryCredentials } from 'aws-sdk';
import { send } from './send';

interface Props {
  ServiceToken: string;
  Exports: string[];
  ShouldErrorIfNotFound?: boolean;
  AssumeRoleArn?: string;
}

interface Attributes {
  [key: string]: string | undefined;
}

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context): Promise<void> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    const { Exports, ShouldErrorIfNotFound, AssumeRoleArn } = event.ResourceProperties as Props;
    const attributes: Attributes = {};

    if (event.RequestType !== 'Delete') {
      let cred: Credentials | undefined;
      if (AssumeRoleArn) {
        cred = new ChainableTemporaryCredentials({
          params: {
            RoleArn: AssumeRoleArn,
            RoleSessionName: 'cross-account-stack-ref-handler',
          },
        });
        await cred.getPromise();
      }

      const cloudformation = new CloudFormation({ credentials: cred });

      const req = await cloudformation.listExports().promise();
      for (const exp of Exports) {
        const ref = req.Exports?.find(x => x.Name === exp);
        if (!ref && ShouldErrorIfNotFound) throw new Error(`Export ${exp} not found.`);
        attributes[exp] = ref?.Value || '';
      }
    }

    await send(event, context, 'SUCCESS', attributes, event.LogicalResourceId);
  } catch (error) {
    console.error('Error:', error);
    await send(event, context, 'FAILED', undefined, event.LogicalResourceId, error);
  }
};
