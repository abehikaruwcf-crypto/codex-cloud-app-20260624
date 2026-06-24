# Charm ID Camera App

Mobile-first app concept for identifying physical charms from smartphone camera images and showing their management numbers.

## Commands

```bash
npm install
npm run dev
npm run build
npm run appstore:audit
```

## Product Direction

The app should support two main workflows:

- Register a charm by entering a management number and capturing six fixed angles: front, back, right side, left side, top side, and bottom side.
- Identify a charm by taking one or more angle-specific camera photos and matching them against the registered charm dataset.
- Improve matching over time by adding user-confirmed identification photos back into the selected charm model.

See [docs/product-requirements.md](docs/product-requirements.md) for the current requirements draft.

## App Store Release Prep

- [docs/app-store-roadmap.md](docs/app-store-roadmap.md) tracks the release path.
- [docs/app-store-submission-packet.md](docs/app-store-submission-packet.md) consolidates App Store Connect inputs.
- [docs/testflight-release-checklist.md](docs/testflight-release-checklist.md) covers the Xcode/TestFlight upload flow.
- [docs/app-privacy-answers.md](docs/app-privacy-answers.md) documents the current local-only privacy answers.
- `public/privacy.html` can be published through the GitHub Pages workflow template in [docs/github-pages-workflow.md](docs/github-pages-workflow.md) and used as the App Store privacy policy URL.

## Codex Cloud

Use this repository from Codex Cloud, then ask Codex to continue development from the GitHub repo instead of the local Mac workspace.

Suggested first prompt:

```text
Use this repository to build the Charm ID Camera App.

Read docs/product-requirements.md first. Then implement the first MVP UI:

1. Replace the current landing page with a mobile-first app shell.
2. Add Register, Identify, and Library views.
3. Implement management number input and six-direction capture UI.
4. Add a mock charm dataset and a placeholder multi-angle matching result flow.
5. Keep the matching layer isolated so it can later be replaced with real image similarity, model inference, or optional 3D reconstruction.

Run npm run build before finishing and summarize the changed files.
```
