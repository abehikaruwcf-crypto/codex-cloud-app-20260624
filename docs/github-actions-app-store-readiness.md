# GitHub Actions App Store Readiness Workflow

The release readiness workflow source is tracked at `docs/workflows/app-store-readiness.yml`.
The current OAuth token cannot create or update files under `.github/workflows/` because it does not have GitHub `workflow` scope.

When using an account or token with workflow permission, copy `docs/workflows/app-store-readiness.yml` to `.github/workflows/app-store-readiness.yml`.
It should stay equivalent to this reference:

```yaml
name: App Store Readiness

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

jobs:
  app-store-readiness:
    name: Build, smoke, and audit
    runs-on: macos-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browser
        run: npx playwright install chromium

      - name: Build web app
        run: npm run build

      - name: Run App Store verification gate
        run: npm run appstore:verify
```

Before App Store release, confirm the installed `.github/workflows/app-store-readiness.yml` workflow is green on the release commit.
`npm run appstore:verify` includes backup validation, unit tests, metadata export, release evidence JSON, `npm run appstore:audit`, `npm run ios:sync`, and release status reporting.

After the manual App Review TODOs are complete and `npm run appstore:status` reports `0 todo`, change the verification step to:

```yaml
      - name: Run strict App Store verification gate
        run: npm run appstore:verify -- --strict
```
