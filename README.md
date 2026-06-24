# Charm ID Camera App

Mobile-first app concept for identifying physical charms from smartphone camera images and showing their management numbers.

## Commands

```bash
npm install
npm run dev
npm run build
npm run appstore:set-version -- 1.0 1
npm run backup:validate -- tests/fixtures/valid-backup.json
npm run appstore:status
npm run appstore:metadata
npm run appstore:connect-packet
npm run appstore:submission-checklist
npm run appstore:rating
npm run appstore:accessibility
npm run appstore:handoff
npm run appstore:screenshots:submission
npm run appstore:xcode-packet
npm run appstore:signoff-draft
npm run appstore:signoff-template
npm run appstore:validate-inputs -- release-inputs.json
npm run appstore:preflight
npm run appstore:evidence
npm run appstore:evidence-check
npm run appstore:audit
npm run appstore:verify
npm run ios:sync
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
- `npm run appstore:metadata` prints the current App Store Connect listing values as JSON.
- `npm run appstore:connect-packet` prints the complete App Store Connect transfer packet.
- `npm run appstore:submission-checklist` prints a screen-by-screen App Store Connect submission checklist.
- `npm run appstore:privacy` prints the App Store Privacy answers and validates the local iOS privacy manifest assumptions.
- `npm run appstore:rating` prints the current App Store age rating questionnaire draft.
- `npm run appstore:accessibility` prints the current Accessibility Nutrition Labels draft.
- `npm run appstore:testflight-packet` prints the physical iPhone TestFlight QA evidence fields needed for final signoff.
- `npm run appstore:handoff` prints the owner/input handoff packet for moving the release from current TODOs to 0 TODOs.
- `npm run appstore:screenshots:submission` generates 6.9 inch and 6.5 inch App Store screenshot-size review assets.
- `npm run appstore:screenshot-packet` prints the generated App Store screenshot asset evidence.
- `npm run appstore:xcode-packet` prints local Xcode archive readiness and the upload signoff field map.
- `npm run appstore:signoff-draft` prints the current App Review signoff draft.
- `npm run appstore:signoff-command` prints the final `appstore:apply-inputs` command with current repo evidence and placeholders for manual App Review values.
- `npm run appstore:signoff-template` prints a JSON `release-inputs.json` template for final App Review evidence.
- `npm run appstore:validate-inputs -- release-inputs.json` validates final release input values before applying them.
- `npm run appstore:preflight` prints the App Store submission preflight packet and remaining manual TODOs.
- `npm run appstore:apply-inputs -- --support-contact <contact> --privacy-contact <contact> --copyright-holder <holder>` applies final release contacts/copyright and can fill final signoff evidence; use `--inputs-file release-inputs.json` for the JSON template flow, and add `--mark-ready` only after every required field is present.
- `npm run appstore:evidence` prints a JSON release evidence snapshot for final signoff, including public URLs, screenshots, and final signoff readiness.
- `npm run appstore:evidence-check` verifies the release evidence snapshot; add `-- --strict` after all manual App Review TODOs are complete.
- `npm run backup:validate -- <backup.json>` validates exported Charm ID backup files before migration, TestFlight QA, or support review.
- [docs/testflight-release-checklist.md](docs/testflight-release-checklist.md) covers the Xcode/TestFlight upload flow.
- [docs/app-review-final-signoff.md](docs/app-review-final-signoff.md) captures the final App Review evidence.
- [docs/release-notes.md](docs/release-notes.md) contains the App Store What's New and TestFlight notes draft.
- [docs/app-privacy-answers.md](docs/app-privacy-answers.md) documents the current local-only privacy answers.
- [docs/workflows/app-store-readiness.yml](docs/workflows/app-store-readiness.yml) is the GitHub Actions readiness workflow source; copy it to `.github/workflows/app-store-readiness.yml` with a token that has `workflow` scope.
- [docs/github-actions-app-store-readiness.md](docs/github-actions-app-store-readiness.md) documents the GitHub Actions readiness workflow, the current token limitation, and the later strict-mode switch.
- `public/privacy.html` and `public/support.html` are bundled with the app; matching `docs/privacy.html` and `docs/support.html` are the GitHub Pages source files tracked in [docs/github-pages-workflow.md](docs/github-pages-workflow.md).

Current release gate:

```bash
npm run appstore:verify
```

`npm run appstore:status` exits non-zero while any App Review TODO remains.
`npm run appstore:verify` still passes hard checks while manual App Review TODOs remain; run `npm run appstore:verify -- --strict` only after contacts, hosted URLs, Xcode, TestFlight, and final signoff are complete.

Known manual blockers before App Review:

- Select full Xcode with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- Select the Apple Developer Program team in Xcode.
- Create the App Store Connect app record.
- Confirm App Store Connect calculates the expected age rating from the release build answers.
- Review Accessibility Nutrition Labels after physical iPhone testing.
- Publish final Privacy Policy and Support URLs.
- Replace the support-page placeholder with the final support contact.
- Generate and review App Store screenshot-size assets with `npm run appstore:screenshots:submission`.
- Run physical iPhone TestFlight validation.
- Validate any migration or QA backup with `npm run backup:validate -- <backup.json>`.
- Complete [docs/app-review-final-signoff.md](docs/app-review-final-signoff.md).

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
