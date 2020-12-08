import { Construct, ITaggable, Resource, TagManager, TagType } from '@aws-cdk/core';
import { CfnConnection } from '@aws-cdk/aws-codestarconnections';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
  PhysicalResourceIdReference,
} from '@aws-cdk/custom-resources';
import { ISubnet, IVpc, SecurityGroup, SubnetSelection } from '@aws-cdk/aws-ec2';

export interface GithubEnterpriseHostProps {
  hostName: string;
  endpoint: string;
  vpc: IVpc;
  subnets: SubnetSelection[];
  tlsCertificate?: string;
}
export class GithubEnterpriseHost extends Resource implements ITaggable {
  public readonly tags: TagManager;
  public readonly hostArn: string;
  //   public readonly hostStatus: string;
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

    this.tags = new TagManager(TagType.STANDARD, 'GithubEnterpriseConnection');

    this.hostName = this.physicalName;
    this.endpoint = endpoint;
    this.vpc = vpc;
    this.subnets = subnets
      .map(selection => this.vpc.selectSubnets(selection))
      .reduce<ISubnet[]>((subnets, selection) => {
        subnets.push(...selection.subnets.filter(x => !subnets.includes(x)));
        return subnets;
      }, []);
    this.securityGroup = new SecurityGroup(this, 'HostSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'Security Group for Github Enterprise Host',
    });
    this.tlsCertificate = tlsCertificate;

    const defaultAwsCall = {
      service: 'CodeStaronnections',
      physicalResourceId: PhysicalResourceId.of(this.physicalName),
      parameters: {
        Name: this.physicalName,
        ProviderEndpoint: endpoint,
        ProviderType: 'GitHubEnterpriseServer',
        VpcConfiguration: {
          VpcId: vpc.vpcId,
          SubnetIds: this.subnets.map(x => x.subnetId),
          SecurityGroupIds: this.securityGroup.securityGroupId,
          TlsCertificate: tlsCertificate,
        },
      },
    };

    this.resource = new AwsCustomResource(this, 'Resource', {
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
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
        parameters: {
          HostArn: new PhysicalResourceIdReference(),
        },
      },
    });

    this.hostArn = this.resource.getResponseField('HostArn');
  }
}

export interface GithubEnterpriseConnectionProps {
  connectionName: string;
  host: GithubEnterpriseHost;
}
export class GithubEnterpriseConnection extends Resource implements ITaggable {
  public readonly tags: TagManager;
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

    this.tags = new TagManager(TagType.STANDARD, 'GithubEnterpriseConnection');

    this.connectionName = this.physicalName;

    this.resource = new CfnConnection(this, 'Resource', {
      connectionName: this.physicalName,
      hostArn: this.host.hostArn,
      providerType: 'GitHubEnterpriseServer',
      tags: this.tags.renderTags(),
    });

    this.connectionArn = this.resource.attrConnectionArn;
    this.connectionStatus = this.resource.attrConnectionStatus;
    this.ownerAccountId = this.resource.attrOwnerAccountId;
  }
}
