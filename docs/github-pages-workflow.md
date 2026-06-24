# GitHub Pages Publishing Notes

## Current Status

The repository is public and GitHub Pages is configured for a static public release page.
The current App Store URL source is:

```text
Source: main /docs
GitHub Pages build status: errored in API checks on 2026-06-24
```

The `gh-pages` branch also exists with a built static app snapshot:

```text
gh-pages @ 6060f23 Trigger GitHub Pages rebuild
```

The final public URLs currently intended for App Store Connect are:

```text
https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html
https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html
```

## GitHub Actions Workflow Template

GitHub rejected direct workflow creation from the current OAuth token because it does not have `workflow` scope.

When using an account or token with workflow permission, create `.github/workflows/pages.yml` with:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

After enabling GitHub Pages with GitHub Actions, the privacy policy should be available at:

```text
https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html
```

The App Store support page should be available at:

```text
https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html
```
