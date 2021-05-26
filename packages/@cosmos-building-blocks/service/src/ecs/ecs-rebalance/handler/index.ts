import { ECS } from 'aws-sdk';
const IGNORE_TAG = 'ecs:rebalance:ignore';

interface EcsEvent {
  id: string;
  source: string;
  'detail-type': string;
  resources: string[];
  detail: {
    clusterArn: string;
    containerInstanceArn: string;
    ec2InstanceId: string;
    agentConnected: boolean;
    status: string;
    pendingTasksCount: number;
    runningTasksCount: number;
  };
}

const { CLUSTER, TIMEOUT } = process.env;
if (!CLUSTER) throw new Error('Cluster env not set.');

const TIMEOUT_MS = Number(TIMEOUT) * 1000;
if (!TIMEOUT_MS) throw new Error('Timeout env is not set.');

const client = new ECS();

export const handler = async (event: EcsEvent): Promise<any> => {
  const { source, 'detail-type': detailType, detail } = event;

  if (source !== 'aws.ecs' || detailType !== 'ECS Container Instance State Change') {
    console.log('Invalid Event');
    return;
  }

  console.log('Valid Event:', JSON.stringify(event));

  if (
    detail.status !== 'ACTIVE' ||
    detail.agentConnected !== true ||
    detail.pendingTasksCount !== 0 ||
    detail.runningTasksCount !== 0
  ) {
    console.log('Instance is not empty or active, skipping.');
    return;
  }

  console.log('Instance is empty and active, triggering rebalance.');

  const services = await fetchAllServices();
  await forceNewDeploymentForServices(services);
};

const forceNewDeploymentForServices = async (services: string[]) => {
  for (const service of services) {
    try {
      await forceNewDeployment(service);
    } catch (error) {
      console.error(error);
    }
  }
};

const forceNewDeployment = async (service: string) => {
  const serviceDetails = await fetchService(service, true);

  if (serviceDetails.status !== 'ACTIVE') {
    console.log(`Service is not active, skipping ${service}`);
    return;
  }

  if (serviceDetails.schedulingStrategy === 'DAEMON') {
    console.log(`Service is DAEMON mode, skipping ${service}`);
    return;
  }

  if (serviceHasIgnoreTag(serviceDetails)) {
    console.log(`Service has ignore tag, skipping ${service}`);
    return;
  }

  if (serviceIsDeploying(serviceDetails)) {
    console.log(`Service is deploying, skipping ${service}`);
    return;
  }

  console.log(`Rebalancing ${service}`);

  await client
    .updateService({
      cluster: CLUSTER,
      service: service,
      forceNewDeployment: true,
    })
    .promise();

  let steady = false;
  const timeout = Timeout(TIMEOUT_MS);

  console.log('Waiting for service to reach a steady state.');
  do {
    const res = await fetchService(service);
    steady = !serviceIsDeploying(res);
    await delay(10000);
  } while (!steady || !timeout());

  console.log('Service Rebalanced');
};

const fetchAllServices = async () => {
  const services: string[] = [];
  let nextToken: string | undefined;

  console.log('Fetching all services');

  do {
    const res = await client
      .listServices({
        cluster: CLUSTER,
        nextToken: nextToken,
      })
      .promise();

    if (res.serviceArns) services.push(...res.serviceArns);

    nextToken = res.nextToken;
    console.log(services, nextToken);
  } while (nextToken !== undefined);

  console.log('Services:', services);

  return services;
};

const fetchService = async (service: string, tags = false) => {
  console.log('Fetching service:', service);
  const res = await client
    .describeServices({
      cluster: CLUSTER,
      services: [service],
      include: tags ? ['TAGS'] : undefined,
    })
    .promise();

  if (res.services?.length) {
    return res.services[0];
  }

  throw new Error(`Could not describe service ${service}`);
};

const serviceHasIgnoreTag = (service: ECS.Service) => {
  return service.tags?.some((x) => x.key === IGNORE_TAG && x.value === 'true');
};

const serviceIsDeploying = (service: ECS.Service) => {
  return service.deployments?.some((x) => x.rolloutState === 'IN_PROGRESS');
};

const delay = (delay: number) => new Promise<void>((res) => setTimeout(() => res(), delay));

const Timeout = (mills: number) => {
  const start = Date.now();
  return () => {
    const span = Date.now() - start;
    if (span >= mills) return true;
    return false;
  };
};
