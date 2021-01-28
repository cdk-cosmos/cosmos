import {
  CfnOutput,
  Construct,
  Lazy,
  CustomResource,
  CustomResourceProvider,
  CustomResourceProviderRuntime,
} from '@aws-cdk/core';
import { IProject, Source, SourceConfig, FilterGroup } from '@aws-cdk/aws-codebuild';
import '@cosmos-building-blocks/common/lib/custom-resource-provider';
import { GithubEnterpriseWebhookProps } from './github-enterprise-webhook-handler/types';
import { PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

export interface WebhookCustomResourceProps {
  readonly project: IProject;
  readonly webhookFilters: FilterGroup[];
}

export class WebhookCustomResource extends Construct {
  constructor(scope: Construct, id: string, props: WebhookCustomResourceProps) {
    super(scope, id);

    const { project, webhookFilters } = props;

    const role = project.role as Role;

    const projectName = Lazy.string({
      produce: () => project.projectName,
    });
    const projectArn = Lazy.string({
      produce: () => project.projectArn,
    });

    const serviceProvider = CustomResourceProvider.getOrCreateProvider(this, 'Custom::WebhookCustomResource', {
      codeDirectory: `${__dirname}/github-enterprise-webhook-handler`,
      runtime: CustomResourceProviderRuntime.NODEJS_12,
      role: role,
    });

    const principal = new ServicePrincipal('lambda.amazonaws.com');
    const statement = new PolicyStatement({
      principals: [principal],
      actions: [principal.assumeRoleAction],
    });
    role.assumeRolePolicy?.addStatements(statement);

    role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['codebuild:CreateWebhook', 'codebuild:UpdateWebhook', 'codebuild:DeleteWebhook'],
        resources: [projectArn],
      })
    );

    const properties: GithubEnterpriseWebhookProps = {
      projectName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterGroups: webhookFilters.map((x) => x._toJson()) as any,
    };

    const webhook = new CustomResource(this, 'Webhook', {
      serviceToken: serviceProvider.serviceToken,
      properties: properties,
      resourceType: 'Custom::WebhookCustomResource',
    });

    new CfnOutput(this, 'Url', {
      value: webhook.getAttString('Url'),
    });
    new CfnOutput(this, 'Secret', {
      value: webhook.getAttString('Secret'),
    });
  }
}

interface GitHubEnterpriseSource extends Source {
  readonly webhook: boolean;
  readonly webhookFilters: FilterGroup[];
}

const gitHubEnterprise = Source.gitHubEnterprise;
Source.gitHubEnterprise = function (props): Source {
  const source = gitHubEnterprise(props) as GitHubEnterpriseSource;
  const bind = source.bind.bind(source);
  source.bind = function (scope, project): SourceConfig {
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
