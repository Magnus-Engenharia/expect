# Publishing Guide

> **Agents**: Do NOT create changesets, bump versions, or publish packages unless a human explicitly asks you to. This guide is for reference only.

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. Releases are fully automated via GitHub Actions with npm Trusted Publishing (OIDC — no tokens stored).

## Published packages


| Package      | npm                                                                      |
| ------------ | ------------------------------------------------------------------------ |
| `expect-cli` | [npmjs.com/package/expect-cli](https://www.npmjs.com/package/expect-cli) |
| `expect-sdk` | [npmjs.com/package/expect-sdk](https://www.npmjs.com/package/expect-sdk) |


## How to release

### 1. Create a changeset

```bash
pnpm changeset
```

Select the packages that changed, pick the semver bump type (`patch` / `minor` / `major`), and write a summary. This creates a `.changeset/<random-name>.md` file.

### 2. Commit the changeset with your PR

```bash
git add .changeset
git commit -m "changeset: short description"
```

Include the changeset file in the same PR as your code changes. Multiple changesets can accumulate across PRs before a release.

### 3. Merge to `main`

When your PR merges, the Release workflow (`release.yml`) runs and opens (or updates) a **"Version Packages"** PR. This PR:

- Consumes all pending `.changeset/*.md` files
- Bumps `version` in each affected `package.json`
- Updates `CHANGELOG.md` for each package

**Important**: This step does NOT publish to npm. It only prepares the version bump PR.

### 4. Merge the "Version Packages" PR

This triggers the Release workflow again. With no pending changesets, it runs `pnpm release` which builds and publishes to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements).

**This is the step that actually publishes to npm.** Nothing is published until you explicitly merge this PR.

## Infrastructure

### GitHub Actions (`release.yml`)

- Runs on every push to `main`
- Uses a **GitHub App** (`RELEASE_APP_ID` / `RELEASE_APP_PRIVATE_KEY` secrets) to author the "Version Packages" PR
- Publishes to npm via **Trusted Publishing** (OIDC) — no npm token needed
- Attaches SLSA provenance attestations to every publish

### Required GitHub repo secrets


| Secret                    | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `RELEASE_APP_ID`          | GitHub App ID for the release bot        |
| `RELEASE_APP_PRIVATE_KEY` | GitHub App private key (`.pem` contents) |


### npm Trusted Publishing

Each published package must have Trusted Publishing configured on npmjs.com:

- **Repository owner**: `millionco`
- **Repository name**: `expect`
- **Workflow filename**: `release.yml`
- **Environment**: *(blank)*

### Changeset config (`.changeset/config.json`)

- `access: "public"` — packages are published publicly
- `baseBranch: "main"` — changesets are diffed against `main`
- `updateInternalDependencies: "patch"` — workspace deps get patch bumps automatically

## Common scenarios

### Releasing a patch fix

```bash
pnpm changeset
# Select: expect-cli
# Bump: patch
# Summary: "Fix crash when no git changes detected"
```

### Releasing a breaking change

```bash
pnpm changeset
# Select: expect-sdk
# Bump: major
# Summary: "Rename TestPlan to ExecutionPlan"
```

### Skipping a release

If your changes don't affect published packages (e.g., internal refactors, CI changes, docs), don't create a changeset. No changeset = no release.

### Adding a new published package

If you add a new package to the monorepo that needs to be published to npm, contact **Aiden Bai** to configure Trusted Publishing for it on npmjs.com. Without this, the CI workflow won't have permission to publish the new package.

### Canary releases

Every push to `main` automatically publishes a canary release to npm with the `canary` dist-tag. These have snapshot versions like `0.0.26-canary-20260405050000`. Install with:

```bash
npm i expect-cli@canary
npm i expect-sdk@canary
```

Canary releases are independent of the stable changeset flow — they always publish, even without a changeset.

### Pre-releases

`expect-sdk` has `publishConfig.tag` set to `alpha`. Published versions go to the `alpha` dist-tag instead of `latest`. Remove this from `package.json` when ready for stable releases.