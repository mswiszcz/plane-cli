# npm Publish Workflow Design

**Date:** 2026-04-07
**Status:** Approved

## Goal

Automatically publish `@mswiszcz/plane-cli` to npm when a GitHub release is created, using npm Trusted Publishers (OIDC) for authentication.

## Approach

GitHub Actions workflow triggered by `release: published`. Uses npm Trusted Publishers — no long-lived NPM_TOKEN needed. Version in `package.json` is synced from the git tag at publish time.

## Release Flow

1. Make changes, merge to main
2. Create a GitHub release with tag `vX.Y.Z` (e.g. `v0.2.0`)
3. Workflow runs: validates tag, syncs version, builds, tests, publishes

## Workflow Design

**File:** `.github/workflows/publish.yml`

**Trigger:** `on: release: types: [published]`

**Permissions:**
- `id-token: write` — required for OIDC authentication with npm
- `contents: read` — checkout access

**Node version:** 22 (required: >= 22.14 for trusted publishers)

**Steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: 22`, `registry-url: https://registry.npmjs.org`
3. `npm ci`
4. Extract version from git tag (`v0.2.0` → `0.2.0`), validate semver format
5. `npm version $VERSION --no-git-tag-version` — syncs `package.json` version to tag (CI-only, no commit pushed back)
6. `npm run build`
7. `npm run test:e2e`
8. `npm publish` — OIDC handles authentication automatically

## Version Strategy

- **Tag-synced:** The git tag is the single source of truth for version
- **Stable only:** Tags must match `vX.Y.Z` pattern (no pre-releases)
- The workflow updates `package.json` version in CI to match the tag; the repo's `package.json` is not modified

## One-Time Setup

1. **First publish must be manual** — run `npm publish` locally (scoped package requirement)
2. **Configure trusted publisher on npmjs.com** — Package Settings → Trusted Publisher → GitHub Actions:
   - Organization or user: `mswiszcz`
   - Repository: `plane-cli`
   - Workflow filename: `publish.yml`
3. No secrets or tokens to manage

## Security

- No long-lived tokens stored in GitHub secrets
- Short-lived, per-publish OIDC credentials
- Automatic provenance attestation (verifiable build origin)
- Consider enabling tag protection rules on GitHub to control who can create release tags

## Constraints

- Requires Node >= 22.14 and npm >= 11.5.1 in CI (does not affect the CLI's runtime `engines: node >= 18`)
- GitHub-hosted runners only (no self-hosted)
- One trusted publisher per package
