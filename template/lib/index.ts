import { Construct, Duration } from '@aws-cdk/core';

export interface LibTemplateProps {
  /**
   * The visibility timeout to be configured on the SQS Queue, in seconds.
   *
   * @default Duration.seconds(300)
   */
  visibilityTimeout?: Duration;
}

export class LibTemplate extends Construct {
  /** @returns the ARN of the SQS queue */
  public readonly queueArn: string;

  constructor(scope: Construct, id: string, props: LibTemplateProps = {}) {
    super(scope, id);
  }
}
