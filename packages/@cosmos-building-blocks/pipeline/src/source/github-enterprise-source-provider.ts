import { Construct } from '@aws-cdk/core';
import { ISource, Source } from '@aws-cdk/aws-codebuild';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Action } from '@aws-cdk/aws-codepipeline-actions';
import { IRole } from '@aws-cdk/aws-iam';
import { SourceProvider } from './source-provider';
import { GithubEnterpriseSourceAction } from './github-enterprise-source-action';
import { GithubEnterpriseConnection } from './github-enterprise-connection';

export interface GithubEnterpriseSourceProviderProps {
  readonly connection: GithubEnterpriseConnection;
  readonly repo: string;
  readonly branch: string;
}

export class GithubEnterpriseSourceProvider extends SourceProvider<string> {
  connection: GithubEnterpriseConnection;

  constructor(props: GithubEnterpriseSourceProviderProps) {
    super({ ...props, trigger: false });

    const { connection } = props;

    this.connection = connection;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  setup(scope: Construct): void {}

  source(branch?: string): ISource {
    return Source.gitHubEnterprise({
      httpsCloneUrl: this.repo,
      branchOrRef: this.branch || branch,
      ignoreSslErrors: true,
    });
  }

  sourceAction(name: string, role: IRole, sourceOutput: Artifact, branch?: string): Action {
    // Convert git url into `user/repo` format
    let repo = this.repo;
    repo = repo.replace(this.connection.host.endpoint, '');
    repo = repo.replace('.git', '');

    return new GithubEnterpriseSourceAction({
      actionName: name,
      connection: this.connection,
      repo: repo,
      branch: branch || this.branch,
      output: sourceOutput,
      variablesNamespace: name,
    });
  }
}
