import { Construct, Lazy, Fn } from '@aws-cdk/core';
import { InstanceType, InstanceClass, InstanceSize, CfnLaunchTemplate } from '@aws-cdk/aws-ec2';
import { CfnInstanceProfile } from '@aws-cdk/aws-iam';
import {
  CfnAutoScalingGroup,
  AutoScalingGroup,
  AutoScalingGroupProps,
  Monitoring,
  BlockDevice,
  EbsDeviceVolumeType,
  BlockDeviceVolume,
} from '@aws-cdk/aws-autoscaling';

/**
 * Properties for AutoScalingGroupLT
 */
export interface AutoScalingGroupLTProps extends AutoScalingGroupProps {
  /**
   * Set this to `true` if you want to use Instance Template instead of Launch Config.
   * You can fine tune your default LaunchTemplate with `instanceType`, `launchTemplateOverrides` and `instancesDistribution`
   * @default - false
   */
  readonly useInstanceTemplate?: boolean;
  /**
   * Type of instance to launch. if used with `useInstanceTemplate = true`, it will be applied to LaunchTemplate.
   * Make sure to check and tweak `launchTemplateOverrides` and `instancesDistribution` as the default values set for those
   * properties will overwrite this InstanceType
   */
  readonly instanceType: InstanceType;
  /**
   * Can only be used along with `useInstanceTemplate = true`.
   * Array of LaunchTemplateOverridesProperty which is a subproperty of LaunchTemplate that describes an override for a launch template.
   * Currently, the only supported override is instance type
   * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-autoscaling-autoscalinggroup-launchtemplateoverrides.html
   * @default
   * [{ instanceType: "t3.medium" }, { instanceType: "t3.small" }]
   *
   * This will use any Spot instances available, "t3.medium" or "t3.small"
   * based on `spotAllocationStrategy` set in `instancesDistribution`
   */
  readonly launchTemplateOverrides?: Array<CfnAutoScalingGroup.LaunchTemplateOverridesProperty>;
  /**
   * Can only be used along with `useInstanceTemplate = true`.
   * Specifies the distribution of On-Demand Instances and Spot Instances,
   * the maximum price to pay for Spot Instances, and how the Auto Scaling group allocates instance types
   * to fulfill On-Demand and Spot capacity.
   * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-autoscaling-autoscalinggroup-instancesdistribution.html
   * @default - Uses all Spot instances of types specified in property `launchTemplateOverrides`
   *  {
   *    onDemandAllocationStrategy: "prioritized",
   *    onDemandBaseCapacity: 0,
   *    onDemandPercentageAboveBaseCapacity: 0,
   *    spotAllocationStrategy: "capacity-optimized",
   *    spotMaxPrice: props.spotPrice,
   *  }
   */
  readonly instancesDistribution?: Partial<CfnAutoScalingGroup.InstancesDistributionProperty>;
}

/**
 * Derived from Base class AutoScalingGroup with additional functionalities of using Launch Template (LT).
 *
 * Base AutoScalingGroup class uses Launch Config and have no ability to use more advanced Launch Templates
 * and MixedInstancesPolicies which gives ability to use Spot fleet and combination of spot and on-demand
 *
 * This construct uses default spot fleet template settings with just one property `useInstanceTemplate = true`
 *
 * With `launchTemplateOverrides` and `instancesDistribution`, it gives additional fine tuning.
 */
export class AutoScalingGroupLT extends AutoScalingGroup {
  constructor(scope: Construct, id: string, props: AutoScalingGroupLTProps) {
    super(scope, id, props);

    // Check if useInstanceTemplate is set to true. If not, do nothing and rely on Base class to
    // to create AutoScalingGroup using LaunchConfig
    const useInstanceTemplate = props.useInstanceTemplate !== undefined ? props.useInstanceTemplate === true : false;
    if (useInstanceTemplate == true) {
      // Prepare props required for LaunchTemplate
      const instanceType =
        props.instanceType !== undefined
          ? props.instanceType.toString()
          : InstanceType.of(InstanceClass.T3, InstanceSize.SMALL).toString();

      const imageConfig = props.machineImage.getImage(this);
      const userDataToken = Lazy.stringValue({
        produce: () => Fn.base64(this.userData.render()),
      });
      const securityGroupIds = this.connections.securityGroups.map(sg => sg.securityGroupId);
      const instanceMonitoringMode =
        props.instanceMonitoring !== undefined ? props.instanceMonitoring === Monitoring.DETAILED : undefined;
      const monitoring = {
        enabled: instanceMonitoringMode == undefined ? true : instanceMonitoringMode,
      };

      const iamProfile = this.node.tryFindChild('InstanceProfile') as CfnInstanceProfile;

      // Create LaunchTemplate

      const lTemplate = new CfnLaunchTemplate(this, 'LaunchTemplate', {
        launchTemplateData: {
          imageId: imageConfig.imageId,
          securityGroupIds,
          userData: userDataToken,
          iamInstanceProfile: { arn: iamProfile.attrArn },
          keyName: props.keyName,
          monitoring,
          instanceType: instanceType,
          blockDeviceMappings:
            props.blockDevices !== undefined ? synthesizeBlockDeviceMappings(this, props.blockDevices) : undefined,
        },
      });
      lTemplate.node.addDependency(this.role);

      // Prepare props for ASG with MixedInstancesPolicy

      const overrides =
        props.launchTemplateOverrides == undefined
          ? [
              {
                instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM).toString(),
              },
              {
                instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL).toString(),
              },
            ]
          : props.launchTemplateOverrides;

      const instancesDistribution = {
        onDemandAllocationStrategy: 'prioritized',
        onDemandBaseCapacity: 0,
        onDemandPercentageAboveBaseCapacity: 0,
        spotAllocationStrategy: 'capacity-optimized',
        spotMaxPrice: props.spotPrice,
        ...props.instancesDistribution,
      };

      // Mixed instance Policy
      const mixedInstancesPolicy: CfnAutoScalingGroup.MixedInstancesPolicyProperty = {
        launchTemplate: {
          launchTemplateSpecification: {
            version: lTemplate.attrLatestVersionNumber,
            launchTemplateId: lTemplate.ref,
          },
          overrides,
        },
        instancesDistribution,
      };

      // Remove LaunchConfig from the resulting CloudFormation template
      if (!this.node.tryRemoveChild('LaunchConfig')) throw new Error('Launch config not found');
      const asg = this.node.tryFindChild('ASG') as CfnAutoScalingGroup;
      asg.addPropertyDeletionOverride('LaunchConfigurationName');
      // Inject mixedInstancesPolicy to use LaunchTemplate
      asg.mixedInstancesPolicy = mixedInstancesPolicy;
    }
  }
}
function synthesizeBlockDeviceMappings(
  construct: Construct,
  blockDevices: BlockDevice[]
): CfnLaunchTemplate.BlockDeviceMappingProperty[] {
  return blockDevices.map<CfnLaunchTemplate.BlockDeviceMappingProperty>(({ deviceName, volume, mappingEnabled }) => {
    const { virtualName, ebsDevice: ebs } = volume;

    if (volume === BlockDeviceVolume.noDevice() || mappingEnabled === false) {
      return {
        deviceName,
        noDevice: 'true',
      };
    }

    if (ebs) {
      const { iops, volumeType } = ebs;

      if (!iops) {
        if (volumeType === EbsDeviceVolumeType.IO1) {
          throw new Error('iops property is required with volumeType: EbsDeviceVolumeType.IO1');
        }
      } else if (volumeType !== EbsDeviceVolumeType.IO1) {
        construct.node.addWarning('iops will be ignored without volumeType: EbsDeviceVolumeType.IO1');
      }
    }

    return {
      deviceName,
      ebs,
      virtualName,
    };
  });
}
