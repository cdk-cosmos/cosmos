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

yarn lerna version $version_bump --force-publish=* --yes --no-push --no-commit-hooks

curent_version=$(git describe --abbrev=0 --tags)

echo -e "$(yarn -s lerna-changelog --from=$prevous_version --to $curent_version)\n\n$(cat changelog.md)" > changelog.md

git add . && git commit --no-verify --amend --no-edit && git tag --force $curent_version
