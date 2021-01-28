/* eslint-disable @typescript-eslint/no-explicit-any */
import { CfnResource } from '@aws-cdk/core';
import { CfnRole, IRole } from '@aws-cdk/aws-iam';
import { CustomResourceProvider } from '@aws-cdk/core/lib/custom-resource-provider/custom-resource-provider';

declare module '@aws-cdk/core/lib/custom-resource-provider/custom-resource-provider' {
  interface CustomResourceProviderProps {
    /**
     * Use an existing role to execute the lambda function
     */
    readonly role?: IRole;
  }
}

const getOrCreateProvider = CustomResourceProvider.getOrCreateProvider;

CustomResourceProvider.getOrCreateProvider = function(scope, uniqueid, props): CustomResourceProvider {
  const provider = getOrCreateProvider(scope, uniqueid, props);

  if (props.role) {
    const providerRole = provider.node.findChild('Role') as CfnRole;
    const providerHandler = provider.node.findChild('Handler') as CfnResource;
    provider.node.tryRemoveChild(providerRole.node.id);
    providerHandler.addPropertyOverride('Role', props.role.roleArn);
    providerHandler.addDependsOn(props.role.node.defaultChild as CfnResource);
    ((providerHandler as any).dependsOn as Set<any>).delete(providerRole);
  }

  return provider;
};
