import { Construct, Stack } from '@aws-cdk/core';
import { ISource, Source } from '@aws-cdk/aws-codebuild';
import { IRepository, Repository } from '@aws-cdk/aws-codecommit';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Action, CodeCommitSourceAction, CodeCommitTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { IRole } from '@aws-cdk/aws-iam';
import { SourceProvider } from './source-provider';

export class CodeCommitSourceProvider extends SourceProvider<IRepository> {
  setup(scope: Construct): void {
    if (Stack.of(scope) !== Stack.of(this.repo)) {
      this.repo = Repository.fromRepositoryName(scope, this.repo.node.id, this.repo.repositoryName);
    }
  }

  source(branch?: string): ISource {
    return Source.codeCommit({
      repository: this.repo,
      branchOrRef: branch || this.branch,
    });
  }

  sourceAction(name: string, role: IRole, sourceOutput: Artifact, branch?: string, trigger?: boolean): Action {
    return new CodeCommitSourceAction({
      actionName: name,
      role: role,
      repository: this.repo,
      branch: branch || this.branch,
      output: sourceOutput,
      trigger: trigger || this.trigger ? CodeCommitTrigger.EVENTS : CodeCommitTrigger.NONE,
      variablesNamespace: name,
    });
  }
}
