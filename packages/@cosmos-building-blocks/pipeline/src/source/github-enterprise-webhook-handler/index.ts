import { CodeBuild } from 'aws-sdk';
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
} from 'aws-lambda/trigger/cloudformation-custom-resource';
import { GithubEnterpriseWebhookProps } from './types';

type Event =
  | CloudFormationCustomResourceCreateEvent
  | CloudFormationCustomResourceUpdateEvent
  | CloudFormationCustomResourceDeleteEvent;

type Response =
  | {
      Data?: any;
      PhysicalResourceId?: string;
      Reason?: string;
      NoEcho?: boolean;
    }
  | undefined;

const codebuild = new CodeBuild();

export async function handler(event: Event): Promise<Response> {
  const props: GithubEnterpriseWebhookProps = { ...(event.ResourceProperties as any), buildType: 'BUILD' };
  switch (event.RequestType) {
    case 'Create':
      return await createWebSocket(props);
    case 'Update':
      return await updateWebSocket(props);

    case 'Delete':
      return await deleteWebhook(props);
  }
}

const createWebSocket = async (props: GithubEnterpriseWebhookProps): Promise<Response> => {
  const { projectName, buildType, filterGroups } = props;

  const response = await codebuild.createWebhook({ projectName, buildType, filterGroups }).promise();

  return {
    PhysicalResourceId: `${props.projectName}Webhook`,
    Data: {
      Url: response.webhook?.payloadUrl,
      Secret: response.webhook?.secret,
    },
  };
};

const updateWebSocket = async (props: GithubEnterpriseWebhookProps): Promise<Response> => {
  const { projectName, buildType, filterGroups } = props;

  const response = await codebuild.updateWebhook({ projectName, buildType, filterGroups }).promise();

  return {
    Data: {
      Url: response.webhook?.payloadUrl,
      Secret: response.webhook?.secret || 'Secret is hidden in updates.',
    },
  };
};

const deleteWebhook = async (props: GithubEnterpriseWebhookProps): Promise<Response> => {
  await codebuild.deleteWebhook({ projectName: props.projectName });
  return;
};
