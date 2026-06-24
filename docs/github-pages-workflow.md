# GitHub Pages Publishing Notes

## Current Status

The `gh-pages` branch has been created and pushed with the built static app:

```text
gh-pages @ a838c67 Publish Charm ID web build
```

GitHub Pages could not be enabled for the current private repository from this account plan:

```text
Your current plan does not support GitHub Pages for this repository.
```

Before App Review, publish `privacy.html` and `support.html` through one of these paths:

- Make this repository public, then enable Pages from the `gh-pages` branch.
- Upgrade or move the repository to a plan that supports Pages for private repositories.
- Host the built `dist` output on another public static host such as Cloudflare Pages, Netlify, Vercel, S3, or a company website.

The App Store Privacy Policy URL and Support URL must be final public URLs, not placeholders.

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
https://<owner>.github.io/<repo>/privacy.html
```

The App Store support page should be available at:

```text
https://<owner>.github.io/<repo>/support.html
```
