import { CfnOutput, Construct, Fn } from '@aws-cdk/core';
// import { NestedStack, NestedStackProps } from '@aws-cdk/aws-cloudformation';
import {
  CfnVPCEndpoint,
  CfnVPCEndpointService,
  IInterfaceVpcEndpoint,
  InterfaceVpcEndpoint,
  IVpc,
  IVpcEndpointServiceLoadBalancer,
  SecurityGroup,
  SubnetType,
  VpcEndpointService,
} from '@aws-cdk/aws-ec2';
import {
  NetworkLoadBalancer,
  NetworkListener,
  NetworkTargetGroup,
  ApplicationLoadBalancer,
  CfnListener,
  TargetType,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { Rule, Schedule, IRuleTarget, RuleTargetInput, IRule } from '@aws-cdk/aws-events';
import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { IFunction } from '@aws-cdk/aws-lambda';
import { CfnRecordSet } from '@aws-cdk/aws-route53';
import { Bucket } from '@aws-cdk/aws-s3';
import { StringParameter } from '@aws-cdk/aws-ssm';

export interface AppProps {
  appAlbNlbVpc: IVpc;
  envName: string;
}

export interface AppAlbProps extends AppProps {
  appAlbNlbVpc: IVpc;
  albSecGroupId: string;
  bucketPrefix: string;
  certificateArn: string;
  envName: string;
  logBucket: string;
}

export interface AppNlbComboCloudwatchLambdaRuleProps {
  lambdaForUpdatingTargets: IFunction;
  scheduleRate?: string;
  // targetInputText: string;
  targetInputObject: any;
}

export interface AppNlbComboInterfaceVpcEndpointProps {
  vpcEndpointServiceLoadBalancers: IVpcEndpointServiceLoadBalancer[];
  envName: string;
  exportName?: string;
  port?: number;
  subnetType?: SubnetType;
  vpc: IVpc;
  whitelistedPrincipals?: ArnPrincipal[];
}

export interface NlbEndpointComboProps extends AppProps { 
  albDnsAddress: string;
  lambdaForUpdatingTargets: IFunction;
  nlbEndpointVpc?: IVpc;
  parameterPath?: string;
  publicHostedZoneId?: string;
  recordName?: string;
  recordSetPrefix?: string;
  zoneName?: string;
}

export class AppNlbComboCloudwatchLambdaRule extends Construct {
  public readonly rule: IRule;

  constructor(scope: Construct, id: string, props: AppNlbComboCloudwatchLambdaRuleProps) {
    super(scope, id);

    const t1: IRuleTarget = {
      bind: () => ({
        id: '',
        arn: props.lambdaForUpdatingTargets.functionArn,
        input: RuleTargetInput.fromObject(props.targetInputObject),
      }),
    };

    const scheduleRate = props.scheduleRate || 'rate(180 minutes)';

    this.rule = new Rule(this, id, {
      // Name
      // Description
      schedule: Schedule.expression(scheduleRate),
      targets: [t1],
    });
  }
}

export class AppAlb extends Construct {
  public readonly albDnsAddress: string;

  constructor(scope: Construct, id: string, props: AppAlbProps) {
    super(scope, id);

    const vpc = props.appAlbNlbVpc;

    const albSecurityGroup = SecurityGroup.fromSecurityGroupId(this, 'sg', props.albSecGroupId);

    // Application Load Balancers
    const uiAlb = new ApplicationLoadBalancer(this, `${props.envName}-alb`, {
      vpc,
      internetFacing: false,
      loadBalancerName: `${props.envName}-alb`,
      deletionProtection: false,
      // vpcSubnets: subnets,
      securityGroup: albSecurityGroup,
    });

    const logBucket = Bucket.fromBucketName(this, 'logBucket', props.logBucket);
    uiAlb.logAccessLogs(logBucket, props.bucketPrefix);

    // const action = new CfnListener.ActionProperty();
    const listener = new CfnListener(this, 'listener', {
      defaultActions: [
        {
          fixedResponseConfig: {
            contentType: 'text/plain',
            messageBody: 'hi from the default last rule',
            statusCode: '200',
          },
          type: 'fixed-response',
        },
      ],
      loadBalancerArn: uiAlb.loadBalancerArn,
      port: 443,
      protocol: 'HTTPS',
      certificates: [{ certificateArn: props.certificateArn }],
    });

    // const action = new CfnListener.ActionProperty();
    const internalListener = new CfnListener(this, 'InternalListener', {
      defaultActions: [
        {
          fixedResponseConfig: {
            contentType: 'text/plain',
            messageBody: 'hi from the default last rule',
            statusCode: '200',
          },
          type: 'fixed-response',
        },
      ],
      loadBalancerArn: uiAlb.loadBalancerArn,
      port: 9443,
      protocol: 'HTTPS',
      certificates: [{ certificateArn: props.certificateArn }],
    });

    new CfnOutput(this, 'ListenerOutput', {
      value: listener.ref,
      exportName: `${props.envName}-Listener`,
    });

    new CfnOutput(this, 'InternalListenerOutput', {
      value: internalListener.ref,
      exportName: `${props.envName}-InternalListener`,
    });

    this.albDnsAddress = uiAlb.loadBalancerDnsName;
  }
}

export class AppNlbComboInterfaceVpcEndpoint extends Construct {
  public readonly interfaceVpcEndpoint: IInterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: AppNlbComboInterfaceVpcEndpointProps) {
    super(scope, id);

    // default is to allow root account to use endpoint
    const whitelistedPrincipals = props.whitelistedPrincipals || [
      new ArnPrincipal(Fn.sub('arn:aws:iam::${AWS::AccountId}:root')),
    ];

    const vpcEndpointService = new VpcEndpointService(this, 'vpcEndpointService', {
      acceptanceRequired: false,
      vpcEndpointServiceLoadBalancers: props.vpcEndpointServiceLoadBalancers,
      whitelistedPrincipals,
    });

    const cfnVPCEndpointService = vpcEndpointService.node.findChild('vpcEndpointService') as CfnVPCEndpointService;

    const subnetType = props.subnetType || SubnetType.PRIVATE;
    const port = props.port || 443;

    this.interfaceVpcEndpoint = new InterfaceVpcEndpoint(this, 'endpoint', {
      vpc: props.vpc,
      service: {
        name: Fn.sub('com.amazonaws.vpce.${AWS::Region}.${serviceName}', {
          serviceName: cfnVPCEndpointService.ref,
        }),
        port,
      },
      privateDnsEnabled: false,
      subnets: {
        subnetType,
      },
    });

    const exportName = props.exportName || 'NlbVpcEndpointId';

    new CfnOutput(this, 'NlbVpcEndpointId', {
      value: this.interfaceVpcEndpoint.vpcEndpointId,
      exportName: `${props.envName}-${exportName}`,
    });

    const cfnVpcEndpoint = this.interfaceVpcEndpoint.node.findChild('Resource') as CfnVPCEndpoint;

    new CfnOutput(this, 'ListenerOutput', {
      value: Fn.select(1, Fn.split(':', Fn.select(0, cfnVpcEndpoint.attrDnsEntries))),
      exportName: `${props.envName}-EndpointDns`,
    });
  }
}

export class NlbEndpointCombo extends Construct {
  constructor(scope: Construct, id: string, props: NlbEndpointComboProps) {
    super(scope, id);

    const vpc = props.appAlbNlbVpc;

    // Default is to use same vpc
    let remoteEndpointVpc = props.appAlbNlbVpc;

    if (props.nlbEndpointVpc !== undefined) {
      remoteEndpointVpc = props.nlbEndpointVpc;
    }

    // Network Load Balancers
    // TODO: subnets, sg
    const netAlb = new NetworkLoadBalancer(this, `${props.envName}-nlb`, {
      vpc,
      // TODO: props
      internetFacing: false,
      loadBalancerName: `${props.envName}-nlb`,
      deletionProtection: false,
      // TODO: props
      crossZoneEnabled: true,
      // vpcSubnets: subnets,
      // securityGroup: albSecurityGroup,
    });

    // AccessLogs only for TLS
    // const logBucket = s3.Bucket.fromBucketName(this, 'logBucket', props.logBucket);
    // netAlb.logAccessLogs(logBucket, props.bucketPrefix);

    const networkTargetGroup = new NetworkTargetGroup(this, `${props.envName}-nlb-tg`, {
      port: 443,
      vpc,
      targetType: TargetType.IP,
    });

    new NetworkListener(this, `${props.envName}-nlb-listener`, {
      loadBalancer: netAlb,
      port: 443,
      defaultTargetGroups: [networkTargetGroup],
    });

    const parameterPath = props.parameterPath || '/App/Alb/app-nlb/';
    const parameterName = `${parameterPath}${props.envName}/dns-saved`;

    // Create a new SSM Parameter holding a String
    new StringParameter(this, 'StringParameter', {
      parameterName,
      stringValue: 'x',
    });

    const inputText = {
      alb_dns_address: props.albDnsAddress,
      alb_dns_parameter: parameterName,
      debug: true,
      dry_run: false,
      alb_target_group_arn: networkTargetGroup.targetGroupArn,
    };

    new AppNlbComboCloudwatchLambdaRule(this, 'appAlbNlbRule', {
      lambdaForUpdatingTargets: props.lambdaForUpdatingTargets,
      // targetInputText: JSON.stringify(inputText),
      targetInputObject: inputText,
    });

    const appNlbComboInterfaceVpcEndpoint = new AppNlbComboInterfaceVpcEndpoint(this, 'appNlbEndpoint', {
      vpc: remoteEndpointVpc,
      envName: props.envName,
      vpcEndpointServiceLoadBalancers: [netAlb],
    });

    // If you define a zone we can publish the dns - otherwise leave it up to the app to do this bit
    if ((props.publicHostedZoneId && !props.zoneName) || (!props.publicHostedZoneId && props.zoneName)) {
      throw new Error('both publicHostedZoneId and zoneName are needed or else both should be empty');
    } else if (props.publicHostedZoneId !== undefined && props.zoneName !== undefined) {
      // TODO: move this back to using constructs
      // prettier-ignore
      // eslint-disable-next-line
      const cfnVpcEndpoint = appNlbComboInterfaceVpcEndpoint.interfaceVpcEndpoint.node.findChild('Resource') as CfnVPCEndpoint;
      // prettier-ignore-end

      const recordSetPrefix = props.recordSetPrefix || 'app-alb-nlb-combo';

      new CfnRecordSet(this, 'EndpointRecordSet', {
        hostedZoneId: props.publicHostedZoneId,
        // FIXME: move to props as string not as import
        name: Fn.join('.', [recordSetPrefix, props.zoneName]),
        type: 'CNAME',
        resourceRecords: [Fn.select(1, Fn.split(':', Fn.select(0, cfnVpcEndpoint.attrDnsEntries)))],
        ttl: '60',
        // Comment, record_set[:comment]
      });
    }
  }
}
