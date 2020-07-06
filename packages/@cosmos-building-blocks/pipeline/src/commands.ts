export const ECR_LOGIN = '$(aws ecr get-login --no-include-email --region ${AWS_REGION})';

export const NPM_LOGIN = 'echo "//registry.npmjs.org/:_authToken=${NPM_KEY}" >> ~/.npmrc';
export const NPM_INSTALL = 'npm ci';
export const NPM_BUILD = 'npm run build';
export const NPM_EXPORT_APP_BUILD_VERSION =
  'export APP_BUILD_VERSION=v$(node -p "require(\'./package.json\').version")-${CODEBUILD_BUILD_NUMBER}'; // eg export APP_BUILD_VERSION=v1.0.0-1

export const DOCKER_BUILD = 'make build';
export const DOCKER_PUSH = 'make push';
export const DOCKER_EXPORT_APP_BUILD_VERSION = 'export APP_BUILD_VERSION=$(make version)';
