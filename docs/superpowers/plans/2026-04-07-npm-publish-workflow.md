# npm Publish Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a GitHub Actions workflow that automatically publishes `@mswiszcz/plane-cli` to npm on release, using Trusted Publishers (OIDC) with tag-synced versioning.

**Architecture:** Single workflow file triggered by `release: published`. Extracts and validates semver from git tag, syncs `package.json` version, builds, tests, publishes via OIDC.

**Tech Stack:** GitHub Actions, npm Trusted Publishers (OIDC), Node 22

---

### Task 1: Create the publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Create `.github/workflows/` directory**

Run: `mkdir -p .github/workflows`

- [ ] **Step 2: Create the workflow file**

```yaml
name: Publish to npm

on:
  release:
    types: [published]

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - name: Install dependencies
        run: npm ci

      - name: Extract and validate version
        id: version
        run: |
          TAG="${GITHUB_REF_NAME}"
          if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Error: Tag '$TAG' does not match vX.Y.Z format"
            exit 1
          fi
          VERSION="${TAG#v}"
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Sync package.json version
        run: npm version ${{ steps.version.outputs.version }} --no-git-tag-version

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test:e2e

      - name: Publish
        run: npm publish
```

- [ ] **Step 3: Verify workflow syntax**

Run: `cat .github/workflows/publish.yml | npx --yes yaml 2>&1 | head -5`
Expected: Valid YAML output, no parse errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: add npm publish workflow with trusted publishers"
```

---

### Task 2: Validate workflow locally with act (optional dry-run)

This task is a manual sanity check — no code changes.

- [ ] **Step 1: Review the workflow file**

Run: `cat .github/workflows/publish.yml`
Expected: All steps present — checkout, setup-node, npm ci, version extract, version sync, build, test, publish.

- [ ] **Step 2: Verify build and test pass locally**

Run: `npm ci && npm run build && npm run test:e2e`
Expected: Build compiles to `dist/` without errors, tests pass.

- [ ] **Step 3: Verify version sync works locally**

Run: `npm version 99.99.99 --no-git-tag-version && cat package.json | grep '"version"' && git checkout package.json`
Expected: Shows `"version": "99.99.99"`, then restores original version.
