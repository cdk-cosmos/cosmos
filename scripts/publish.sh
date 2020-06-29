#!/bin/sh

echo "//registry.npmjs.org/:_authToken=$NPM_KEY" > .npmrc

yarn clean 
yarn build
yarn lerna publish from-git --yes