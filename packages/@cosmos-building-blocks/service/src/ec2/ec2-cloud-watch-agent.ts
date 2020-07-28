/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Construct, Lazy, Stack } from '@aws-cdk/core';
import { Instance, OperatingSystemType } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

export interface CloudWatchAgentProps {
  instance: Instance | AutoScalingGroup;
  interval?: number;
  dimensions?: Record<string, string>;
  omitHostname?: boolean;
  runAsUser?: string;
  metrics?: CloudWatchMetric[];
  defaultMetrics?: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
    network: boolean;
  };
}

export class CloudWatchAgent extends Construct {
  private interval: number;
  private dimensions: Record<string, string>;
  private omitHostname?: boolean;
  private runAsUser: string;
  private metrics: CloudWatchMetric[];

  constructor(scope: Construct, id: string, props: CloudWatchAgentProps) {
    super(scope, id);

    const {
      instance,
      interval = 60,
      dimensions = {
        InstanceId: '${aws:InstanceId}',
        InstanceType: '${aws:InstanceType}',
      },
      omitHostname = true,
      runAsUser = 'root',
      metrics = [],
      defaultMetrics = {
        cpu: true,
        memory: true,
        disk: true,
        network: true,
      },
    } = props;

    this.interval = interval;
    this.dimensions = dimensions;
    this.omitHostname = omitHostname;
    this.runAsUser = runAsUser;
    this.metrics = metrics;

    if (defaultMetrics.cpu) this.addCpuMetric();
    if (defaultMetrics.memory) this.addMemoryMetric();
    if (defaultMetrics.disk) this.addDiskMetric();
    if (defaultMetrics.network) this.addNetworkMetric();

    if (instance.osType !== OperatingSystemType.LINUX) throw new Error('Linux is the only supported OS tyoe.');

    const config = Lazy.stringValue({
      produce: () => {
        const stack = Stack.of(this);
        const json = stack.resolve(stack.toJsonString(this.renderConfig())) as string;
        const escapedJson = json.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        return escapedJson;
      },
    });
    const region = Stack.of(this).region;

    instance.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    instance.userData.addCommands(
      `rpm -Uvh https://s3.${region}.amazonaws.com/amazoncloudwatch-agent-${region}/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm`,
      `echo -e "${config}" > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`,
      'sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json'
    );
  }

  addCpuMetric(): this {
    this.metrics.push(
      new CloudWatchMetricBuilder('cpu')
        .addMeasurement('usage_nice')
        .addProperty('totalcpu', true)
        .toMetric()
    );
    return this;
  }
  addMemoryMetric(): this {
    this.metrics.push(new CloudWatchMetricBuilder('mem').addMeasurement('mem_used_percent').toMetric());
    return this;
  }
  addDiskMetric(): this {
    this.metrics.push(
      new CloudWatchMetricBuilder('disk')
        .addMeasurement('used_percent')
        .addResource('*')
        .toMetric()
    );
    return this;
  }
  addNetworkMetric(): this {
    this.metrics.push(
      new CloudWatchMetricBuilder('netstat').addMeasurement('tcp_established', 'udp_socket').toMetric()
    );
    return this;
  }

  private renderConfig(): object {
    return {
      agent: {
        metrics_collection_interval: this.interval,
        omit_hostname: this.omitHostname,
        run_as_user: this.runAsUser,
      },
      metrics: {
        append_dimensions: this.dimensions,
        metrics_collected: this.metrics.reduce<Record<string, object>>((result, { name, ...props }) => {
          result[name] = props;
          return result;
        }, {}),
      },
    };
  }
}

export interface CloudWatchMetric extends Record<string, any> {
  name: string;
  namespace: string;
  interval: number;
  measurement: string[];
  resources?: string[];
}

export class CloudWatchMetricBuilder {
  private name: string;
  private namespace: string;
  private interval: number;
  private measurement: string[];
  private resources: string[];
  private properties: Record<string, any>;

  constructor(name: string) {
    this.name = name;
    this.namespace = 'CWAgent';
    this.interval = 60;
    this.measurement = [];
    this.resources = [];
    this.properties = {};
  }

  setNamespace(namespace: string): this {
    this.namespace = namespace;
    return this;
  }

  setInterval(interval: number): this {
    this.interval = interval;
    return this;
  }

  addMeasurement(...measurement: string[]): this {
    this.measurement.push(...measurement);
    return this;
  }

  addResource(...resource: string[]): this {
    this.resources.push(...resource);
    return this;
  }

  addProperty(key: string, value: any): this {
    this.properties[key] = value;
    return this;
  }

  toMetric(): CloudWatchMetric {
    return {
      ...this.properties,
      name: this.name,
      namespace: this.namespace,
      interval: this.interval,
      measurement: this.measurement,
      resources: this.resources.length > 0 ? this.resources : undefined,
    };
  }
}
