import { Construct, Stack } from '@aws-cdk/core';
import { Dashboard, GraphWidget, DashboardProps, SingleValueWidget } from '@aws-cdk/aws-cloudwatch';
import { ICluster } from '@aws-cdk/aws-ecs';
import { ecsMetric } from '../';

export interface ClusterDashboardProps extends DashboardProps {
  cluster: ICluster;
  dashboard?: Dashboard;
}

export class ClusterDashboard extends Construct {
  readonly Dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: ClusterDashboardProps) {
    super(scope, id);

    const { cluster, dashboard, ...dashboardProps } = props;
    const region = Stack.of(this).region;

    const cpuUtilization = ecsMetric(this, cluster, 'CPUUtilization');
    const cpuReservation = ecsMetric(this, cluster, 'CPUReservation');
    const memoryUtilization = ecsMetric(this, cluster, 'MemoryUtilization');
    const memoryReservation = ecsMetric(this, cluster, 'MemoryReservation');

    const cpuValue = new SingleValueWidget({
      title: 'Cluster CPU Usage',
      metrics: [cpuUtilization, cpuReservation],
      width: 8,
      height: 3,
      region,
    });

    const memoryValue = new SingleValueWidget({
      title: 'Cluster Memory Usage',
      metrics: [memoryUtilization, memoryReservation],
      width: 8,
      height: 3,
      region,
    });

    const cpuGraph = new GraphWidget({
      title: 'Cluster CPU Usage',
      left: [cpuUtilization],
      right: [cpuReservation],
      width: 8,
      height: 8,
      region,
    });

    const memoryGraph = new GraphWidget({
      title: 'Cluster Memory Usage',
      left: [memoryUtilization],
      right: [memoryReservation],
      width: 8,
      height: 8,
      region,
    });

    // TODO: # of instances and containers

    if (dashboard) {
      this.Dashboard = dashboard;
    } else {
      this.Dashboard = new Dashboard(this, 'ClusterDashboard', {
        dashboardName: `ECSDashboard-${cluster.clusterName}`,
        ...dashboardProps,
      });
    }

    this.Dashboard.addWidgets(cpuValue, memoryValue);
    this.Dashboard.addWidgets(cpuGraph, memoryGraph);
  }
}
