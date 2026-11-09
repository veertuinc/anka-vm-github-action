# Releasing

The daily Automation follows this page from top to bottom. A security patch has no other steps.

Default branch: `edge`.

Tag format: `vMAJOR.MINOR.PATCH`. Example: `v1.3.4`.

The tag has three numeric parts and a leading `v`. It has no beta suffix. `v1.3.4` is a valid tag. `v1.3.4-beta` is not. `1.3.4` is not.

The same number, without `v`, is written to `VERSION` and to `package.json` `"version"`.

There is no Jenkins job. Do not create a Jenkins job. Do not trigger a Jenkins job.

There is no npm publish, Marketplace upload, or Docker Hub upload. The GitHub Release is the publish step.

Users pin `veertuinc/anka-vm-github-action@vX.Y.Z`. Do not create or move a major tag such as `v1`.

## Version

The next security version is the latest full GitHub Release tag plus one patch.

1. Read the latest release:

```bash
gh release view --repo veertuinc/anka-vm-github-action --json tagName,isPrerelease,isDraft
```

2. Stop if `isPrerelease` is true. Stop if `isDraft` is true. Stop if `tagName` does not match `vMAJOR.MINOR.PATCH` (three numbers, leading `v`, nothing else).
3. Add 1 to PATCH only. Do not change MAJOR or MINOR.

On 2026-11-09 the latest full release is `v1.3.3`, so the next security tag is `v1.3.4` and the file value is `1.3.4`.

Compute the number from the latest full release. Do not increment the number already in `VERSION` or `package.json`. Those files can disagree. On 2026-11-09 `VERSION` is `1.3.3` and `package.json` is `1.3.2`.

Beta tags (`v1.2.2-beta` and older) are not the latest release.

If the computed tag already exists, stop. Do not move it.

```bash
gh release view vX.Y.Z --repo veertuinc/anka-vm-github-action
```

A "not found" result means the tag is free.

## Test gate

The only required check is the workflow named `CodeQL`, file `.github/workflows/codeql-analysis.yml`.

That workflow runs on push to `edge` and on pull requests into `edge`.

On the commit you will tag, both jobs must finish with conclusion `success`:

- `Analyze (javascript-typescript)`
- `Analyze (actions)`

The Actions UI shows these as `CodeQL / Analyze (javascript-typescript)` and `CodeQL / Analyze (actions)`. The check-run `name` has no `CodeQL /` prefix.

Do not require any other check.

Workflow `Tests` (`.github/workflows/tests.yml`) is not a gate. It runs on a self-hosted macOS runner and needs Anka. A failed, skipped, or missing `Tests` run does not block the release. Do not dispatch `Tests`. Do not retry it.

Do not use the scheduled workflow path `dynamic/github-code-scanning/codeql`. Those runs are CodeQL default setup. They are not this gate.

## Make the release commit

Work on `edge`. Do not open a `release/vX.Y.Z` branch.

1. Check out `edge` and pull.
2. Write `X.Y.Z` to `VERSION` (one line, no `v`).
3. Set the package version to the same string:

```bash
npm pkg set version=X.Y.Z
npm install --package-lock-only
```

`npm install --package-lock-only` updates the lockfile version field. It must not change dependency ranges. If the lockfile diff is more than the version field, stop.

4. Install and rebuild `dist/`. The action runs `dist/index.js`.

```bash
npm ci
npm run package
```

`npm run package` sets `NODE_OPTIONS=--openssl-legacy-provider`. `@zeit/ncc` 0.22.3 fails on Node.js 17 and newer without that flag. Do not remove the flag. Do not upgrade ncc in this commit. Do not run `npm audit fix`.

5. Commit `VERSION`, `package.json`, `package-lock.json`, and `dist/` when they changed. Push to `edge`.

```bash
git add VERSION package.json package-lock.json dist
git commit -m "Release X.Y.Z"
git push origin edge
```

6. Record the full SHA: `git rev-parse HEAD`. The tag must point at this SHA. Do not pass the branch name `edge` as the release target.

If the push is rejected, stop. Do not force-push. Do not open a fork pull request for the version bump.

## Wait for CodeQL

Wait until the `CodeQL` workflow run for that SHA completes.

```bash
gh run list --repo veertuinc/anka-vm-github-action --commit "$SHA" --workflow codeql-analysis.yml --json databaseId,status,conclusion,headSha
```

- If the list is empty, stop. Do not tag. CodeQL default setup blocks this workflow file. A person must switch the repository from CodeQL default setup to advanced setup. You cannot change that setting.
- If `conclusion` is `failure`, `cancelled`, or `timed_out`, stop. Do not tag.
- Read the jobs. Both names below must be `success`:

```bash
gh api repos/veertuinc/anka-vm-github-action/actions/runs/$RUN_ID/jobs --jq '.jobs[] | {name,conclusion}'
```

Required names: `Analyze (javascript-typescript)` and `Analyze (actions)`.

## Publish

Create one full GitHub Release on that SHA. Do not pass `--prerelease`. Do not pass `--draft`.

Release notes are the only changelog. Do not add a CHANGELOG file. Do not commit the notes.

Each note line names one security fix: the GHSA or CVE id, the package name, and the old and new versions. Use the fixes already merged on this commit. If you cannot name a GHSA or CVE, stop. Do not publish.

```bash
gh release create vX.Y.Z --repo veertuinc/anka-vm-github-action --target "$SHA" --title vX.Y.Z --notes "$NOTES"
```

Confirm the result:

```bash
gh release view vX.Y.Z --repo veertuinc/anka-vm-github-action --json tagName,isDraft,isPrerelease,targetCommitish
```

`isDraft` is false. `isPrerelease` is false. `targetCommitish` is the release SHA.

Do not move an older tag. Do not delete a release. Do not force-push a tag.
