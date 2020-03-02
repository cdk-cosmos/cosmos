export const ECR_LOGIN = '$(aws ecr get-login --no-include-email --region ${AWS_REGION})';

export const NPM_INSTALL = 'npm ci';

export const NPM_RUN_BUILD = 'npm run build';

// eg export APP_BUILD_VERSION=v1.0.0-1
export const NPM_EXPORT_APP_BUILD_VERSION =
  'export APP_BUILD_VERSION=v$(node -p "require(\'./package.json\').version")-${CODEBUILD_BUILD_NUMBER}';
