import { Construct } from '@aws-cdk/core';
import {
  ActionBindOptions,
  ActionCategory,
  ActionConfig,
  Artifact,
  CommonAwsActionProps,
  IStage,
} from '@aws-cdk/aws-codepipeline';
import { Action } from '@aws-cdk/aws-codepipeline-actions';
import { sourceArtifactBounds } from '@aws-cdk/aws-codepipeline-actions/lib/common';
import { IGithubEnterpriseConnection } from './github-enterprise-connection';

export interface GitHubEnterpriseSourceVariables {
  /** The date when the commit was authored, in timestamp format. */
  readonly authorDate: string;
  /** The name of the branch for the repository where the source change was made. */
  readonly branchName: string;
  /** The commit ID that triggered the pipeline execution. */
  readonly commitId: string;
  /** The description message, if any, associated with the commit that triggered the pipeline execution. */
  readonly commitMessage: string;
  /** The connection ARN that is configured and authenticated for the source provider.. */
  readonly connectionArn: string;
  /** TThe name of the repository where the commit that triggered the pipeline was made. */
  readonly repositoryName: string;
}

export interface GithubEnterpriseSourceActionProps extends CommonAwsActionProps {
  /**
   * S3 Bucket for Output Artifact
   */
  readonly output: Artifact;
  /**
   * The Github Enterprise Connection to use
   */
  readonly connection: IGithubEnterpriseConnection;
  /**
   * The name of the repo, with the username. e.g. `some-user/my-repo`
   */
  readonly repo: string;
  /**
   * The branch to use.
   *
   * @default "master"
   */
  readonly branch?: string;

  /**
   *  The Artifact Output Format.
   *  @default "CODE_ZIP"
   */
  readonly outputFormat?: string;
}

export class GithubEnterpriseSourceAction extends Action {
  private readonly props: GithubEnterpriseSourceActionProps;

  constructor(props: GithubEnterpriseSourceActionProps) {
    super({
      ...props,
      version: '1',
      owner: 'AWS',
      category: ActionCategory.SOURCE,
      provider: 'CodeStarSourceConnection',
      artifactBounds: sourceArtifactBounds(),
      outputs: [props.output],
    });

    this.props = props;
  }
  /**
   * The variables emitted by this action.
   */
  get variables(): GitHubEnterpriseSourceVariables {
    return {
      authorDate: this.variableExpression('AuthorDate'),
      branchName: this.variableExpression('BranchName'),
      commitId: this.variableExpression('CommitId'),
      commitMessage: this.variableExpression('CommitMessage'),
      connectionArn: this.variableExpression('ConnectionArn'),
      repositoryName: this.variableExpression('FullRepositoryName'),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected bound(scope: Construct, stage: IStage, options: ActionBindOptions): ActionConfig {
    // the Action will write the contents of the Git repository to the Bucket,
    // so its Role needs write permissions to the Pipeline Bucket
    options.bucket.grantReadWrite(options.role);

    // The action will require access to the connection
    this.props.connection.grantRead(options.role);

    return {
      configuration: {
        ConnectionArn: this.props.connection.connectionArn,
        FullRepositoryId: this.props.repo,
        BranchName: this.props.branch || 'master',
        OutputArtifactFormat: this.props.outputFormat || 'CODE_ZIP',
      },
    };
  }
}
