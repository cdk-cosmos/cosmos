import { Construct, Stack, StackProps, Duration } from "@aws-cdk/core";
import {
  Vpc,
  SubnetType,
  IVpc,
  InstanceType,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService
} from "@aws-cdk/aws-ec2";
import {
  HostedZone,
  ZoneDelegationRecord,
  IHostedZone
} from "@aws-cdk/aws-route53";
import { Repository } from "@aws-cdk/aws-ecr";
import {
  Cluster,
  Ec2TaskDefinition,
  Ec2Service,
  ContainerImage,
  Protocol
} from "@aws-cdk/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationListener,
  ContentType
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { GalaxyStack, ISolarSystem } from ".";

// Minimal Target Solar System
export interface TargetSolarSystemStackProps extends StackProps {}

export class TargetSolarSystemStack extends Stack implements ISolarSystem {
  readonly galaxy: GalaxyStack;
  readonly appEnv: string;
  readonly vpc: IVpc;
  readonly zone: IHostedZone;

  constructor(
    galaxy: GalaxyStack,
    appEnv: string,
    props?: TargetSolarSystemStackProps
  ) {
    super(
      galaxy.cosmos.app,
      `Cosmos-${galaxy.account}-${appEnv}-TargetSolarSystem`,
      props
    );

    this.galaxy = galaxy;
    this.appEnv = appEnv;

    this.vpc = this.galaxy.node.tryFindChild("SharedVpc") as IVpc;
    if (!this.vpc) {
      this.vpc = new Vpc(this.galaxy, "SharedVpc", {
        cidr: "10.0.0.0/22",
        maxAzs: 3,
        subnetConfiguration: [
          {
            name: "Core",
            subnetType: SubnetType.ISOLATED,
            cidrMask: 26
          }
        ]
      });

      // TODO: move to internet endpoint Endpoints ?
      this.vpc.addGatewayEndpoint("S3Gateway", {
        service: GatewayVpcEndpointAwsService.S3,
        subnets: [this.vpc.selectSubnets({ onePerAz: true })]
      });
      this.vpc.addInterfaceEndpoint("EcsEndpoint", {
        service: InterfaceVpcEndpointAwsService.ECS
      });
      this.vpc.addInterfaceEndpoint("EcsAgentEndpoint", {
        service: InterfaceVpcEndpointAwsService.ECS_AGENT
      });
      this.vpc.addInterfaceEndpoint("EcsTelemetryEndpoint", {
        service: InterfaceVpcEndpointAwsService.ECS_TELEMETRY
      });
      this.vpc.addInterfaceEndpoint("EcrEndpoint", {
        service: InterfaceVpcEndpointAwsService.ECR
      });
      this.vpc.addInterfaceEndpoint("EcrDockerEndpoint", {
        service: InterfaceVpcEndpointAwsService.ECR_DOCKER
      });
    }

    const cosmosZoneName = this.galaxy.cosmos.zone.zoneName;
    this.zone = new HostedZone(this, "HostedZone", {
      zoneName: `${appEnv}.${cosmosZoneName}`.toLowerCase()
    });

    new ZoneDelegationRecord(this, "ZoneDelegation", {
      zone: this.galaxy.cosmos.zone,
      recordName: this.zone.zoneName,
      nameServers: this.zone.hostedZoneNameServers as string[]
    });
  }
}

// ECS Target Solar System
export interface EcsTargetSolarSystemStackProps
  extends TargetSolarSystemStackProps {}

export class EcsTargetSolarSystemStack extends TargetSolarSystemStack {
  readonly cluster: Cluster;
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpsListener: ApplicationListener;

  constructor(
    scope: GalaxyStack,
    appEnv: string,
    props?: EcsTargetSolarSystemStackProps
  ) {
    super(scope, appEnv, props);

    this.cluster = new Cluster(this, "Cluster", {
      vpc: this.vpc
    });

    this.cluster.addCapacity("Capacity", {
      instanceType: new InstanceType("t2.medium"),
      desiredCapacity: 1
    });

    // this.alb = new ApplicationLoadBalancer(this, "Alb", {
    //   vpc: this.vpc
    // });
    // this.httpListener = this.alb.addListener("HttpListener", {
    //   port: 80,
    //   open: true
    // });
    // TODO:
    // this.httpListener = this.alb.addListener("HttpsListener", {
    //   port: 443,
    //   open: true
    // });
    // this.httpListener.addFixedResponse("Fixed", {
    //   pathPattern: "/ok",
    //   contentType: ContentType.TEXT_PLAIN,
    //   messageBody: "OK",
    //   statusCode: "200",
    //   priority: 9999
    // });
  }
}
