#!/bin/bash
set -e

version_bump=""
prevous_version=$(git describe --abbrev=0 --tags)

if [ -z "$GITHUB_AUTH" ]; then
    echo "Missing GITHUB_AUTH env"
    exit 1
fi

if [ "$PATCH" == "true" ]; then
    version_bump="patch"
fi
if [ "$MINOR" == "true" ]; then
    version_bump="minor"
fi
if [ -z "$version_bump" ]; then
    echo "PATCH or MINOR not set"
    exit 1
fi

echo $prevous_version, $version_bump

yarn clean
yarn build
yarn lerna version $version_bump --force-publish=* --yes --no-push

curent_version=$(git describe --abbrev=0 --tags)

echo $prevous_version, $curent_version, $version_bump

echo "$(yarn -s lerna-changelog --from=$prevous_version --to $curent_version)\n$(cat changelog.md)" > changelog.md

git add . && git commit --no-verify --amend --no-edit
