import { FilterGroups } from 'aws-sdk/clients/codebuild';

export interface GithubEnterpriseWebhookProps {
  projectName: string;
  buildType?: string;
  filterGroups?: FilterGroups;
}
