# npm Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make plane-cli installable as a global npm package via `npm install -g @mswiszcz/plane-cli`

**Architecture:** Update package.json metadata, add LICENSE and .npmignore, update README install instructions.

**Tech Stack:** npm packaging (no new dependencies)

---

### Task 1: Update package.json for npm publishing

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package.json**

Change `name`, add `files`, `publishConfig`, `prepublishOnly`, and `keywords`:

```json
{
  "name": "@mswiszcz/plane-cli",
  "version": "0.1.0",
  "description": "CLI for Plane.so project tracker",
  "type": "module",
  "bin": {
    "plane": "dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test:e2e": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "publishConfig": {
    "access": "public"
  },
  "keywords": [
    "plane",
    "plane.so",
    "cli",
    "project-management",
    "work-items"
  ],
  "engines": {
    "node": ">=18"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mswiszcz/plane-cli.git"
  }
}
```

Note: `dependencies` and `devDependencies` remain unchanged (not shown for brevity).

- [ ] **Step 2: Verify build works**

Run: `npm run build`
Expected: Compiles to `dist/` without errors

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: configure package.json for npm publishing"
```

---

### Task 2: Add MIT LICENSE file

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create LICENSE**

```
MIT License

Copyright (c) 2026 Mateusz Świszcz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add MIT LICENSE"
```

---

### Task 3: Add .npmignore

**Files:**
- Create: `.npmignore`

- [ ] **Step 3.1: Create .npmignore**

```
src/
e2e/
docs/
.claude/
.gitignore
.plane.toml
tsconfig.json
vitest.config.ts
*.test.ts
```

- [ ] **Step 3.2: Verify package contents**

Run: `npm pack --dry-run`
Expected: Only `dist/`, `package.json`, `README.md`, and `LICENSE` are included. No `src/`, `e2e/`, or `docs/`.

- [ ] **Step 3.3: Commit**

```bash
git add .npmignore
git commit -m "chore: add .npmignore to exclude non-dist files"
```

---

### Task 4: Update README install instructions

**Files:**
- Modify: `README.md:13-16` (Install section)

- [ ] **Step 4.1: Update the Install section**

Replace the current Install section with:

```markdown
## Install

```bash
npm install -g @mswiszcz/plane-cli
```

This installs the `plane` command globally.
```

Also remove the "After building" section (lines 33-39) since global install replaces `npm link`.

- [ ] **Step 4.2: Commit**

```bash
git add README.md
git commit -m "docs: update README with npm install instructions"
```

---

### Task 5: Dry-run publish verification

- [ ] **Step 5.1: Build and verify package**

Run: `npm run build && npm pack --dry-run`
Expected: Package lists only dist/, package.json, README.md, LICENSE. Total size should be small (under 100KB).

- [ ] **Step 5.2: Test global install locally**

Run: `npm pack && npm install -g mswiszcz-plane-cli-0.1.0.tgz`
Expected: `plane --version` prints `0.1.0`, `plane --help` shows command list.

- [ ] **Step 5.3: Clean up**

```bash
rm mswiszcz-plane-cli-0.1.0.tgz
npm uninstall -g @mswiszcz/plane-cli
```

- [ ] **Step 5.4: Publish**

Run: `npm publish`
Expected: Package published to https://www.npmjs.com/package/@mswiszcz/plane-cli
