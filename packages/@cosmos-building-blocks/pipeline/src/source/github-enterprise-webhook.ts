import { CfnOutput, Construct, Lazy } from '@aws-cdk/core';
import { IProject, Source, SourceConfig, FilterGroup } from '@aws-cdk/aws-codebuild';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from '@aws-cdk/custom-resources';

export interface WebhookCustomResourceProps {
  readonly project: IProject;
  readonly webhookFilters: FilterGroup[];
}

export class WebhookCustomResource extends Construct {
  constructor(scope: Construct, id: string, props: WebhookCustomResourceProps) {
    super(scope, id);

    const { project, webhookFilters } = props;

    const projectName = Lazy.stringValue({
      produce: () => project.projectName,
    });
    const projectArn = Lazy.stringValue({
      produce: () => project.projectArn,
    });

    const defaultAwsCall = {
      service: 'CodeBuild',
      physicalResourceId: PhysicalResourceId.of(`${projectName}Webhook`),
      parameters: {
        projectName: projectName,
        buildType: 'BUILD',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filterGroups: webhookFilters.map((x: any) => x._toJson()),
      },
    };

    const webhook = new AwsCustomResource(this, 'Webhook', {
      role: project.role,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [projectArn],
      }),
      onCreate: {
        ...defaultAwsCall,
        action: 'createWebhook',
      },
      onUpdate: {
        ...defaultAwsCall,
        action: 'updateWebhook',
      },
      onDelete: {
        ...defaultAwsCall,
        action: 'deleteWebhook',
        parameters: {
          projectName: defaultAwsCall.parameters.projectName,
        },
      },
    });

    new CfnOutput(this, 'Url', {
      value: webhook.getResponseField('webhook.payloadUrl'),
    });
    new CfnOutput(this, 'Secret', {
      value: webhook.getResponseField('webhook.secret'),
    });
  }
}

interface GitHubEnterpriseSource extends Source {
  readonly webhook: boolean;
  readonly webhookFilters: FilterGroup[];
}

const gitHubEnterprise = Source.gitHubEnterprise;
Source.gitHubEnterprise = function(props): Source {
  const source = gitHubEnterprise(props) as GitHubEnterpriseSource;
  const bind = source.bind.bind(source);
  source.bind = function(scope, project): SourceConfig {
    const config = bind(scope, project);
    if (this.webhook) {
      new WebhookCustomResource(scope, 'Webhook', {
        project: project,
        webhookFilters: this.webhookFilters,
      });
      return {
        ...config,
        buildTriggers: undefined,
      };
    } else return config;
  };
  return source;
};
