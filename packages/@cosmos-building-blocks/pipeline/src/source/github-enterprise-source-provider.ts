import { Construct } from '@aws-cdk/core';
import { ISource, Source } from '@aws-cdk/aws-codebuild';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Action } from '@aws-cdk/aws-codepipeline-actions';
import { IRole } from '@aws-cdk/aws-iam';
import { SourceProvider, SourceProviderProps } from './source-provider';
import { GithubEnterpriseSourceAction } from './github-enterprise-source-action';
import { IGithubEnterpriseConnection } from './github-enterprise-connection';
import { URL } from 'url';

export interface GithubEnterpriseSourceProviderProps extends SourceProviderProps<string> {
  /**
   * The Github Enterprise Connection to use
   */
  readonly connection: IGithubEnterpriseConnection;
}

export class GithubEnterpriseSourceProvider extends SourceProvider<string> {
  connection: IGithubEnterpriseConnection;

  constructor(props: GithubEnterpriseSourceProviderProps) {
    super(props);

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

  sourceAction(name: string, role: IRole, sourceOutput: Artifact, branch?: string, trigger?: boolean): Action {
    // Convert git url into `user/repo` format
    let repo = this.repo;
    if (repo.startsWith('http')) {
      const url = new URL(repo);
      repo = url.pathname;
    }
    repo = repo.replace(/^\//, '');
    repo = repo.replace('.git', '');

    const _trigger = trigger !== undefined ? trigger : this.trigger;

    return new GithubEnterpriseSourceAction({
      actionName: name,
      role: role,
      connection: this.connection,
      repo: repo,
      branch: branch || this.branch,
      output: sourceOutput,
      variablesNamespace: name,
      detectChanges: _trigger,
    });
  }
}
