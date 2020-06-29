#!/bin/sh
prevous_version=$(git describe --abbrev=0 --tags)
version_bump=${VERSION_BUMP:-"patch"}
push=${PUSH:-"false"}

if [ !$GITHUB_AUTH ]; then
    echo "Missing GITHUB_AUTH env"
fi

echo $prevous_version, $version_bump, $push

yarn lerna version $version_bump --force-publish=* --yes --no-push

curent_version=$(git describe --abbrev=0 --tags)

echo $prevous_version, $curent_version, $version_bump, $push

echo "$(yarn -s lerna-changelog --from=$prevous_version --to $curent_version)\n$(cat changelog.md)" > changelog.md

git add . && git commit --amend --no-edit

if [ $push == "true" ]; then
    git push
fi