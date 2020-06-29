#!/bin/sh
prevous_version=$(git describe --abbrev=0 --tags)
version_bump=${VERSION_BUMP:-"patch"}
push=${PUSH:-"false"}

echo $prevous_version, $version_bump, $push

exec yarn lerna version $version_bump --force-publish=* --yes --no-push

curent_version=$(git describe --abbrev=0 --tags)

echo $prevous_version, $curent_version, $version_bump, $push

echo -e "$(yarn -s lerna-changelog --from=$prevous_version --to $curent_version)\n$(cat changelog.md)" > changelog.md