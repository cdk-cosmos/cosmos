import { Construct } from '@aws-cdk/core';
import { ISource } from '@aws-cdk/aws-codebuild';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { Action } from '@aws-cdk/aws-codepipeline-actions';
import { IRole } from '@aws-cdk/aws-iam';
import { IRepository } from '@aws-cdk/aws-ecr';

export interface SourceProviderProps<Repo> {
  readonly repo: Repo;
  readonly branch: string;
  readonly trigger: boolean;
}

export abstract class SourceProvider<Repo = IRepository | string> {
  repo: Repo;
  branch: string;
  trigger: boolean;

  constructor(props: SourceProviderProps<Repo>) {
    const { repo, branch, trigger } = props;
    this.repo = repo;
    this.branch = branch;
    this.trigger = trigger;
  }

  abstract setup(scope: Construct): void;
  abstract source(branch?: string, trigger?: boolean): ISource;
  abstract sourceAction(name: string, role: IRole, sourceOutput: Artifact, branch?: string, trigger?: boolean): Action;
}
