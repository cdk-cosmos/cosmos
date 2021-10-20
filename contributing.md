# Contributing to Cosmos

## Contributing individual changes

1. Create issue with labels for:
   - cdk-cosmos (or repo worked on)
   - and must have one of: `bug`, `enhancement`, `breaking-change`, `documentation`, `chore`
2. Link issue to project (e.g. Cosmos)
3. **Must** add GH issue number to commits and PRs
4. Fork `develop` branch and continue contributions from your fork.
5. Push your changes to your fork and create Pull Request from `fork/develop` to `cdk-cosmos/develop`
   - The pull request **MUST** be labelled with one of: `bug`, `enhancement`, `breaking-change`, `documentation`, `chore`
   - Also label the PR with `cdk-cosmos` (or repo worked on)
   - Link PR to project (e.g. Cosmos)
   - Ideally you should have a one to one mapping between GH issues and PRs to `develop` branch
   - In either case list the GH issue numbers that the PR addresses either in the title or description
   - If tests fail because of stale snapshots, run: `yarn test -- -- -u` and commit snapshots
6. After checks pass and PR is approved `Squash Merge` PR from `fork/develop` to `cdk-cosmos/develop`

## Release Process

1. Maintainers agree on at what point a release should be done
2. Create release PR with title `Release vX.Y.Z` labelled with one of: `release:patch` or `release:minor`
3. Merge release PR with `Merge Commit` from `develop` to `master`, and wait for it to be published
4. Fetch release notes from the latest release commit's `changelog.md` file.
5. Create new release (`vX.Y.Z`) and add the above notes to the release tag.
