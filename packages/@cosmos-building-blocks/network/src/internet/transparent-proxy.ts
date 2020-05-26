import { Construct, Stack } from '@aws-cdk/core';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import {
  InstanceType,
  InstanceClass,
  InstanceSize,
  AmazonLinuxImage,
  AmazonLinuxGeneration,
  IVpc,
  SubnetSelection,
  CfnRoute,
  Subnet,
  SecurityGroup,
  Peer,
  Port,
} from '@aws-cdk/aws-ec2';
import { PolicyStatement, ManagedPolicy } from '@aws-cdk/aws-iam';

export interface TransparentProxyProps {
  vpc: IVpc;
  vpcSubnets?: SubnetSelection;
  host: string;
  port: number;
  perAZ?: boolean;
  initialInstanceId?: string;
}

export class TransparentProxy extends Construct {
  public readonly autoScalingGroup: AutoScalingGroup;

  constructor(scope: Construct, id: string, props: TransparentProxyProps) {
    super(scope, id);

    const { vpc, vpcSubnets, perAZ, host, port, initialInstanceId } = props;

    this.autoScalingGroup = new AutoScalingGroup(this, 'Asg', {
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.NANO),
      machineImage: new AmazonLinuxImage({ generation: AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      vpc,
      vpcSubnets,
      desiredCapacity: perAZ ? vpc.availabilityZones.length : 1,
    });

    this.autoScalingGroup.role.addToPolicy(
      new PolicyStatement({
        actions: [
          'ec2:ModifyInstanceAttribute',
          'ec2:DescribeInstances',
          'ec2:DescribeRouteTables',
          'ec2:ReplaceRoute',
        ],
        resources: ['*'],
      })
    );
    this.autoScalingGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));

    const securityGroup = this.autoScalingGroup.node.tryFindChild('InstanceSecurityGroup') as SecurityGroup;
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic());

    this.configureSquidUserData(
      host,
      port,
      !perAZ ? vpc.selectSubnets(vpcSubnets).subnets.map(x => x.routeTable.routeTableId) : undefined
    );

    // Let CFN own the route so its cleaned up when stack deleted. (hack)
    if (initialInstanceId) {
      for (const subnet of vpc.selectSubnets(vpcSubnets).subnets as Subnet[]) {
        new CfnRoute(this, `${subnet.node.id}DefaultRoute`, {
          routeTableId: subnet.routeTable.routeTableId,
          destinationCidrBlock: '0.0.0.0/0',
          instanceId: initialInstanceId,
        });
      }
    }
  }

  private configureSquidUserData(host: string, port: number, routingTaleIds?: string[]): void {
    const userData = this.autoScalingGroup.userData;

    // Redirect the user-data output to the console logs
    userData.addCommands('exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1');

    // Install Squid
    userData.addCommands(
      `export HTTP_PROXY=http://${host}:${port} && export HTTPS_PROXY=$HTTP_PROXY`,
      'yum install -y squid iptables-services',
      'unset HTTP_PROXY && unset HTTPS_PROXY',
      'iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8081',
      'iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8082',
      'iptables-save > /etc/sysconfig/iptables',
      'systemctl enable squid',
      'systemctl enable iptables'
    );

    // Add Squid Cert
    userData.addCommands(
      'mkdir /etc/squid/ssl',
      'cd /etc/squid/ssl',
      'openssl genrsa -out squid.key 4096',
      'openssl req -new -key squid.key -out squid.csr -subj "/L=proxy/O=cosmos/CN=squid"',
      'openssl x509 -req -days 3650 -in squid.csr -signkey squid.key -out squid.crt',
      'cat squid.key squid.crt >> squid.pem'
    );

    // Add Squid Config
    userData.addCommands(
      'cd /etc/squid',
      'echo http_port 8080 >> squid.conf',
      'echo http_port 8081 intercept >> squid.conf',
      'echo https_port 8082 cert=/etc/squid/ssl/squid.pem ssl-bump intercept >> squid.conf',
      'echo ssl_bump splice all >> squid.conf',
      `echo cache_peer ${host} parent ${port} 0 default >> squid.conf`,
      'echo never_direct allow all >> squid.conf',
      'echo http_access allow all >> squid.conf',
      'systemctl start squid',
      'systemctl start iptables'
    );

    // Configure Instance
    userData.addCommands(
      `region=${Stack.of(this).region}`,
      'instanceId=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)',
      'aws ec2 modify-instance-attribute --region=${region} --instance-id=${instanceId} --no-source-dest-check'
    );

    // Configure Routes
    if (routingTaleIds) {
      userData.addCommands(
        `declare -a routingTableIds=(${routingTaleIds.join(' ')})`,
        'for routingTableId in "${routingTableIds[@]}"',
        'do',
        'aws ec2 replace-route --region=${region} --route-table-id=${routingTableId} --destination-cidr-block=0.0.0.0/0 --instance-id=${instanceId}',
        'done'
      );
    } else {
      userData.addCommands(
        'subnetId=$(aws ec2 describe-instances --region=${region} --instance-id=${instanceId} --query=Reservations[*].Instances[].SubnetId --output=text)',
        'routingTableId=$(aws ec2 describe-route-tables --region=${region} --query="RouteTables[*].Associations[?SubnetId==\'${subnetId}\'].RouteTableId" --output text)',
        'aws ec2 replace-route --region=${region} --route-table-id=${routingTableId} --destination-cidr-block=0.0.0.0/0 --instance-id=${instanceId}'
      );
    }
  }
}
