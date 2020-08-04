import { SynthUtils, expect as cdkExpect, haveResourceLike, ABSENT, objectLike, arrayWith } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { AutoScalingGroupLT } from '../src/index';
import { Vpc, SubnetType, InstanceClass, InstanceType, InstanceSize, MachineImage } from '@aws-cdk/aws-ec2';
import { BlockDeviceVolume } from '@aws-cdk/aws-autoscaling';
import '@aws-cdk/assert/jest';

test('Should match snapshot', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'aws-autoscaling');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
    ],
  });
  // ASG using Launch Template
  new AutoScalingGroupLT(stack, 'SpotAsgLaunchTemplate', {
    useInstanceTemplate: true,
    machineImage: MachineImage.latestAmazonLinux(),
    vpc,
    vpcSubnets: { subnetGroupName: 'App' },
    minCapacity: 0,
    maxCapacity: 5,
    desiredCapacity: 1,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
    spotPrice: '0.03',
  });

  // ASG using Launch Config
  new AutoScalingGroupLT(stack, 'DefaultAsgLaunchConfig', {
    useInstanceTemplate: false,
    machineImage: MachineImage.latestAmazonLinux(),
    vpc,
    vpcSubnets: { subnetGroupName: 'App' },
    minCapacity: 0,
    maxCapacity: 5,
    desiredCapacity: 1,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
    // spotPrice: '0.03',
  });
  // THEN
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('When useInstanceTemplate flag set to true, should create ASG with default Launch Template settings', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'aws-autoscaling');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
    ],
  });
  const spotasg = new AutoScalingGroupLT(stack, 'DefaultSpotAsgLaunchTemplate', {
    useInstanceTemplate: true,
    machineImage: MachineImage.latestAmazonLinux(),
    vpc,
    vpcSubnets: { subnetGroupName: 'App' },
    minCapacity: 0,
    maxCapacity: 5,
    desiredCapacity: 1,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
    spotPrice: '0.03',
  });
  spotasg.scaleOnCpuUtilization('CPUScale', { targetUtilizationPercent: 70 });

  const MixedInstancesPolicy = {
    InstancesDistribution: {
      OnDemandAllocationStrategy: 'prioritized',
      OnDemandBaseCapacity: 0,
      OnDemandPercentageAboveBaseCapacity: 0,
      SpotAllocationStrategy: 'capacity-optimized',
      SpotMaxPrice: '0.03',
    },
    LaunchTemplate: {
      LaunchTemplateSpecification: {
        LaunchTemplateId: {
          Ref: 'DefaultSpotAsgLaunchTemplate6D11B85A',
        },
        Version: {
          'Fn::GetAtt': ['DefaultSpotAsgLaunchTemplate6D11B85A', 'LatestVersionNumber'],
        },
      },
      Overrides: [
        {
          InstanceType: 't3.medium',
        },
        {
          InstanceType: 't3.small',
        },
      ],
    },
  };

  // THEN
  // ASG should have Launch Template and scaling policy
  cdkExpect(stack).to(haveResourceLike('AWS::EC2::LaunchTemplate'));
  cdkExpect(stack).to(haveResourceLike('AWS::AutoScaling::ScalingPolicy'));
  cdkExpect(stack).notTo(haveResourceLike('AWS::AutoScaling::LaunchConfiguration'));
  // ASG should have MixedInstancesPolicy
  cdkExpect(stack).to(
    haveResourceLike('AWS::AutoScaling::AutoScalingGroup', { MixedInstancesPolicy: MixedInstancesPolicy })
  );
});

test('Switching off or not passing LauchTemplate flag should create standard ASG from base AutoScalingGroup', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'autoscaling-default');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
    ],
  });
  const stack1 = new cdk.Stack(app, 'autoscaling-default1');
  const vpc1 = new Vpc(stack1, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
    ],
  });
  // ASG LT with only required props
  const spotasg = new AutoScalingGroupLT(stack, 'StandardASG', {
    machineImage: MachineImage.latestAmazonLinux(),
    vpc,
    vpcSubnets: { subnetGroupName: 'App' },
    minCapacity: 0,
    maxCapacity: 5,
    desiredCapacity: 1,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
  });
  spotasg.scaleOnCpuUtilization('CPUScale', { targetUtilizationPercent: 70 });

  new AutoScalingGroupLT(stack1, 'StandardASGWithProp', {
    useInstanceTemplate: false, // Use standard @aws-cdk Base Class AutoScalingGroup
    machineImage: MachineImage.latestAmazonLinux(),
    vpc: vpc1,
    vpcSubnets: { subnetGroupName: 'App' },
    minCapacity: 0,
    maxCapacity: 5,
    desiredCapacity: 1,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
  });
  // THEN
  // ASG should have Launch Config and scaling policy
  cdkExpect(stack).to(haveResourceLike('AWS::AutoScaling::LaunchConfiguration'));
  cdkExpect(stack).to(haveResourceLike('AWS::AutoScaling::ScalingPolicy'));
  // ASG should have Launch Config and should not have LaunchTemplate
  cdkExpect(stack1).to(haveResourceLike('AWS::AutoScaling::LaunchConfiguration'));
  cdkExpect(stack1).notTo(haveResourceLike('AWS::EC2::LaunchTemplate'));
});

test('Should be able to overwrite LauchTemplate related properties', () => {
  //WHEN
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'aws-autoscaling');
  const vpc = new Vpc(stack, 'vpc', {
    maxAzs: 3,
    subnetConfiguration: [
      {
        name: 'App',
        subnetType: SubnetType.ISOLATED,
        cidrMask: 26,
      },
    ],
  });

  // Overwrite launchTemplateOverrides and instancesDistribution (onDemandBaseCapacity, spotAllocationStrategy)
  // Also overwrite blockDevices to check if new volume mapping will be created or not
  const spotasg = new AutoScalingGroupLT(stack, 'OverwriteLTASG', {
    useInstanceTemplate: true,
    launchTemplateOverrides: [{ instanceType: 'm2.small' }, { instanceType: 'm2.large' }],
    instancesDistribution: {
      onDemandBaseCapacity: 1,
      spotAllocationStrategy: 'lowest-price',
    },
    machineImage: MachineImage.latestAmazonLinux(),
    vpc,
    vpcSubnets: { subnetGroupName: 'App' },
    minCapacity: 0,
    maxCapacity: 5,
    desiredCapacity: 1,
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
    blockDevices: [{ volume: BlockDeviceVolume.ebs(20), deviceName: 'xvdb' }],
    spotPrice: '0.03',
  });
  spotasg.scaleOnCpuUtilization('CPUScale', { targetUtilizationPercent: 70 });

  // THEN
  // ASG should have Launch Template and scaling policy
  cdkExpect(stack).to(haveResourceLike('AWS::EC2::LaunchTemplate'));
  cdkExpect(stack).to(haveResourceLike('AWS::AutoScaling::ScalingPolicy'));
  cdkExpect(stack).notTo(haveResourceLike('AWS::AutoScaling::LaunchConfiguration'));
  // Launch Template should have new BlockDeviceMappings
  cdkExpect(stack).to(
    haveResourceLike('AWS::EC2::LaunchTemplate', {
      LaunchTemplateData: objectLike({
        BlockDeviceMappings: [
          {
            DeviceName: 'xvdb',
            Ebs: {
              VolumeSize: 20,
            },
          },
        ],
      }),
    })
  );
  // ASG should have overwritten properties
  cdkExpect(stack).to(
    haveResourceLike('AWS::AutoScaling::AutoScalingGroup', {
      LaunchConfigurationName: ABSENT,
      MixedInstancesPolicy: objectLike({
        InstancesDistribution: objectLike({ OnDemandBaseCapacity: 1, SpotAllocationStrategy: 'lowest-price' }),
        LaunchTemplate: objectLike({
          Overrides: arrayWith(
            {
              InstanceType: 'm2.small',
            },
            {
              InstanceType: 'm2.large',
            }
          ),
        }),
      }),
    })
  );
});
