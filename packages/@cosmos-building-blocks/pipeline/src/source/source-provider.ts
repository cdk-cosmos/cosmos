import { Construct } from '@aws-cdk/core';
import { ISource } from '@aws-cdk/aws-codebuild';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Action } from '@aws-cdk/aws-codepipeline-actions';
import { IRole } from '@aws-cdk/aws-iam';
import { IRepository } from '@aws-cdk/aws-ecr';

export interface SourceProviderProps<Repo> {
  /**
   * The repo to use.
   *
   */
  readonly repo: Repo;
  /**
   * The branch to use.
   *
   */
  readonly branch?: string;
  /**
   *  Controls automatically starting your pipeline when a new commit is made.
   */
  readonly trigger?: boolean;
}

export abstract class SourceProvider<Repo = IRepository | string> {
  repo: Repo;
  branch: string;
  trigger: boolean;

  constructor(props: SourceProviderProps<Repo>) {
    const { repo, branch = 'master', trigger = true } = props;

    this.repo = repo;
    this.branch = branch;
    this.trigger = trigger;
  }

  abstract setup(scope: Construct): void;
  abstract source(branch?: string, trigger?: boolean): ISource;
  abstract sourceAction(name: string, role: IRole, sourceOutput: Artifact, branch?: string, trigger?: boolean): Action;
}
