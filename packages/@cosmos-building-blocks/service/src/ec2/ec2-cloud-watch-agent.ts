import { Construct, Lazy, Stack } from '@aws-cdk/core';
import { Instance, OperatingSystemType } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { ManagedPolicy } from '@aws-cdk/aws-iam';

/**
 * Properties for Cloud Watch Agent
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
 */
export interface CloudWatchAgentProps {
  /**
   * Which Compute to install the agent onto
   */
  compute: Instance | AutoScalingGroup;
  /**
   * The number of seconds for the update interval
   * @default 60
   */
  interval?: number;
  /**
   * Extra dimensions to add to each metric (labels)
   * @default { InstanceId: '${aws:InstanceId}', InstanceType: '${aws:InstanceType}' }
   */
  dimensions?: Record<string, string>;
  /**
   * Omit the Hostname as an dimension
   * @default true
   */
  omitHostname?: boolean;
  /**
   * Which user to runt he agent under on the host
   * @default "root"
   */
  runAsUser?: string;
  /**
   * Initialize with some metrics
   * @default []
   */
  metrics?: CloudWatchMetric[];
  /**
   * Enable some default metrics
   * @default { cpu: false, memory: true, disk: true, network: false }
   */
  defaultMetrics?: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
    network: boolean;
  };
}

/**
 * Add Cloud Watch Agent to compute host
 */
export class CloudWatchAgent extends Construct {
  private interval: number;
  private dimensions: Record<string, string>;
  private omitHostname?: boolean;
  private runAsUser: string;
  private metrics: CloudWatchMetric[];

  constructor(scope: Construct, id: string, props: CloudWatchAgentProps) {
    super(scope, id);

    const {
      compute,
      interval = 60,
      dimensions = {
        InstanceId: '${aws:InstanceId}',
        InstanceType: '${aws:InstanceType}',
      },
      omitHostname = true,
      runAsUser = 'root',
      metrics = [],
      defaultMetrics = {
        cpu: false,
        memory: true,
        disk: true,
        network: false,
      },
    } = props;

    if (compute.osType !== OperatingSystemType.LINUX) throw new Error('Linux is the only supported OS type.');

    this.interval = interval;
    this.dimensions = dimensions;
    this.omitHostname = omitHostname;
    this.runAsUser = runAsUser;
    this.metrics = metrics;

    if (defaultMetrics.cpu) this.addCpuMetric();
    if (defaultMetrics.memory) this.addMemoryMetric();
    if (defaultMetrics.disk) this.addDiskMetric();
    if (defaultMetrics.network) this.addNetworkMetric();

    const config = Lazy.stringValue({
      produce: () => {
        const stack = Stack.of(this);
        const json = stack.resolve(stack.toJsonString(this.renderConfig())) as string;
        const escapedJson = json.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        return escapedJson;
      },
    });
    const region = Stack.of(this).region;

    compute.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    compute.userData.addCommands(
      `rpm -Uvh https://s3.${region}.amazonaws.com/amazoncloudwatch-agent-${region}/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm`,
      `echo -e "${config}" > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`,
      'sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json'
    );
  }

  addMetric(...metrics: CloudWatchMetric[]): this {
    this.metrics.push(...metrics);
    return this;
  }

  addCpuMetric(): this {
    this.addMetric(
      new CloudWatchMetricBuilder('cpu')
        .addMeasurement('usage_nice')
        .addProperty('totalcpu', true)
        .toMetric()
    );
    return this;
  }
  addMemoryMetric(): this {
    this.addMetric(new CloudWatchMetricBuilder('mem').addMeasurement('mem_used_percent').toMetric());
    return this;
  }
  addDiskMetric(): this {
    this.addMetric(
      new CloudWatchMetricBuilder('disk')
        .addMeasurement('used_percent')
        .addResource('*')
        .toMetric()
    );
    return this;
  }
  addNetworkMetric(): this {
    this.addMetric(new CloudWatchMetricBuilder('netstat').addMeasurement('tcp_established', 'udp_socket').toMetric());
    return this;
  }

  private renderConfig(): object {
    return {
      agent: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        metrics_collection_interval: this.interval,
        // eslint-disable-next-line @typescript-eslint/camelcase
        omit_hostname: this.omitHostname,
        // eslint-disable-next-line @typescript-eslint/camelcase
        run_as_user: this.runAsUser,
      },
      metrics: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        append_dimensions: this.dimensions,
        // eslint-disable-next-line @typescript-eslint/camelcase
        metrics_collected: this.metrics.reduce<Record<string, object>>((result, { name, ...props }) => {
          result[name] = props;
          return result;
        }, {}),
      },
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CloudWatchMetric extends Record<string, any> {
  name: string;
  namespace: string;
  interval: number;
  measurement: string[];
  resources?: string[];
}

/**
 * Builder for a metric for Cloud Watch Agent
 */
export class CloudWatchMetricBuilder {
  private name: string;
  private namespace: string;
  private interval: number;
  private measurement: string[];
  private resources: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
