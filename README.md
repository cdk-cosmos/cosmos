# Cosmos CDK Packages

## Development

### Packages

1. Clone Repo
2. Run `yarn` then `yarn link` then `yarn bootstrap`

### Testing Packages

1.  Build `yarn build`
2.  Lint `yarn lint`
3.  Test `yarn test`

### Test Cdk Apps (cdk-test)

1. `cd` into the app
2. `npm install` like it was any normal cdk app
3. `npx cdk synth` like normal

<!-- FIXME: -->

`npx lerna link`
`npx lerna bootstrap`
`npx lerna publish`
`npx lerna publish --force-publish=*`

`("@?aws-cdk(/.+)?": ".?)([0-9]+.[0-9]+.[0-9]+)(")` -> `$11.27.0$4`
