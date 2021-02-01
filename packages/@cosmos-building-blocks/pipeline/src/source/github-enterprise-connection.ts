import { IConstruct, Construct, Resource } from '@aws-cdk/core';
import { CfnConnection } from '@aws-cdk/aws-codestarconnections';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
  PhysicalResourceIdReference,
} from '@aws-cdk/custom-resources';
import { ISubnet, IVpc, SecurityGroup, SubnetSelection, Peer, Port } from '@aws-cdk/aws-ec2';
import { PolicyStatement } from '@aws-cdk/aws-iam';

export interface GithubEnterpriseHostProps {
  hostName: string;
  endpoint: string;
  vpc: IVpc;
  subnets: SubnetSelection[];
  tlsCertificate?: string;
}

export class GithubEnterpriseHost extends Resource {
  public readonly hostArn: string;
  public readonly hostName: string;
  public readonly endpoint: string;
  public readonly vpc: IVpc;
  public readonly subnets: ISubnet[];
  public readonly securityGroup: SecurityGroup;
  public readonly tlsCertificate?: string;
  private resource: AwsCustomResource;

  constructor(scope: Construct, id: string, props: GithubEnterpriseHostProps) {
    super(scope, id, {
      physicalName: props.hostName,
    });

    const { endpoint, vpc, subnets, tlsCertificate } = props;

    this.hostName = this.physicalName;
    this.endpoint = endpoint;
    this.vpc = vpc;
    this.subnets = subnets
      .map((selection) => this.vpc.selectSubnets(selection))
      .reduce<ISubnet[]>((subnets, selection) => {
        subnets.push(...selection.subnets.filter((x) => !subnets.includes(x)));
        return subnets;
      }, []);
    this.securityGroup = new SecurityGroup(this, 'HostSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: false,
      description: 'Security Group for Github Enterprise Host',
    });
    this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    this.securityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(443));
    this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    this.securityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(80));
    this.tlsCertificate = tlsCertificate;

    const defaultAwsCall = {
      service: 'CodeStarconnections',
      physicalResourceId: PhysicalResourceId.fromResponse('HostArn'),
      parameters: {
        Name: this.physicalName,
        ProviderEndpoint: endpoint,
        ProviderType: 'GitHubEnterpriseServer',
        VpcConfiguration: {
          VpcId: vpc.vpcId,
          SubnetIds: this.subnets.map((x) => x.subnetId),
          SecurityGroupIds: [this.securityGroup.securityGroupId],
          TlsCertificate: tlsCertificate,
        },
      },
    };

    this.resource = new AwsCustomResource(this, 'Resource', {
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: [
            'codestar-connections:CreateHost',
            'codestar-connections:UpdateHost',
            'codestar-connections:DeleteHost',
          ],
          resources: ['*'],
        }),
        new PolicyStatement({
          actions: [
            'ec2:CreateNetworkInterface',
            'ec2:CreateTags',
            'ec2:DescribeDhcpOptions',
            'ec2:DescribeNetworkInterfaces',
            'ec2:DescribeSubnets',
            'ec2:DeleteNetworkInterface',
            'ec2:DescribeVpcs',
            'ec2:CreateVpcEndpoint',
            'ec2:DeleteVpcEndpoints',
            'ec2:DescribeVpcEndpoints',
          ],
          resources: ['*'],
        }),
      ]),
      onCreate: {
        ...defaultAwsCall,
        action: 'createHost',
      },
      onUpdate: {
        ...defaultAwsCall,
        action: 'updateHost',
      },
      onDelete: {
        ...defaultAwsCall,
        action: 'deleteHost',
        physicalResourceId: undefined,
        parameters: {
          HostArn: new PhysicalResourceIdReference(),
        },
      },
    });

    this.hostArn = this.resource.getResponseField('HostArn');
  }
}

export interface IGithubEnterpriseConnection extends IConstruct {
  readonly connectionArn: string;
}

export interface GithubEnterpriseConnectionProps {
  connectionName: string;
  host: GithubEnterpriseHost;
}
export class GithubEnterpriseConnection extends Resource implements IGithubEnterpriseConnection {
  public readonly connectionArn: string;
  public readonly connectionStatus: string;
  public readonly ownerAccountId: string;
  public readonly connectionName: string;
  public readonly host: GithubEnterpriseHost;
  private resource: CfnConnection;

  constructor(scope: Construct, id: string, props: GithubEnterpriseConnectionProps) {
    super(scope, id, {
      physicalName: props.connectionName,
    });

    const { host } = props;

    this.host = host;

    this.connectionName = this.physicalName;

    this.resource = new CfnConnection(this, 'Resource', {
      connectionName: this.physicalName,
      hostArn: this.host.hostArn,
    });

    this.connectionArn = this.resource.attrConnectionArn;
    this.connectionStatus = this.resource.attrConnectionStatus;
    this.ownerAccountId = this.resource.attrOwnerAccountId;
  }

  static fromConnectionArn(scope: Construct, id: string, connectionArn: string): IGithubEnterpriseConnection {
    return new GithubEnterpriseConnectionImport(scope, id, connectionArn);
  }
}

class GithubEnterpriseConnectionImport extends Construct implements IGithubEnterpriseConnection {
  readonly connectionArn: string;

  constructor(scope: Construct, id: string, connectionArn: string) {
    super(scope, id);

    this.connectionArn = connectionArn;
  }
}
