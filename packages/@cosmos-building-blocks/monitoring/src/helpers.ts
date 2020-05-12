import { Construct } from '@aws-cdk/core';
import { Metric, MetricProps } from '@aws-cdk/aws-cloudwatch';
import { ICluster } from '@aws-cdk/aws-ecs';

export const ecsMetric: (
  scope: Construct,
  cluster: ICluster,
  metricName: string,
  props?: Partial<MetricProps>
) => Metric = (scope, cluster, metricName, props = {}): Metric => {
  return new Metric({
    namespace: 'AWS/ECS',
    metricName,
    dimensions: { ClusterName: cluster.clusterName },
    ...props,
  }).attachTo(scope);
};
