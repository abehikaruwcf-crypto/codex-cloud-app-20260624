# App Store Submission Packet

This packet consolidates the current App Store Connect inputs for the local-only Charm ID release candidate.

## App Identity

- App name: Charm ID
- Bundle ID: `com.wcf.charmid`
- SKU suggestion: `charm-id-ios`
- Primary language: Japanese for the first release candidate.
- iOS development region: `ja`
- Category: Business
- Secondary category: Productivity
- Age rating expectation: 4+

## Version

- Marketing version: `1.0`
- Build number: `1`
- Release type: Manual release after App Review approval.
- Release notes: [release-notes.md](release-notes.md)

## App Store Metadata

Use [app-store-metadata.md](app-store-metadata.md) as the source draft for:

- Subtitle
- Promotional text
- Description
- Keywords
- Review notes
- What's New text from [release-notes.md](release-notes.md)
- Japanese listing fields from the `Japanese Metadata Draft` section.

Print the current App Store Connect listing values with:

```bash
npm run appstore:metadata
```

Print the complete App Store Connect transfer packet with:

```bash
npm run appstore:connect-packet
```

Print the screen-by-screen App Store Connect submission checklist with:

```bash
npm run appstore:submission-checklist
```

Print the combined submission preflight packet with:

```bash
npm run appstore:preflight
```

The metadata export validates current App Store Connect field limits used for this release: app name 30 characters, subtitle 30 characters, promotional text 170 characters, description 4000 characters, keywords 100 bytes, and What's New 4000 characters.

Before final submission, replace generic prototype wording with final customer-facing language and confirm whether the public listing should target charms only or broader small-item inventory.

## Privacy

Use [app-privacy-answers.md](app-privacy-answers.md) for App Store Connect privacy answers.

Current local-only assumption:

- No login.
- No cloud sync.
- No analytics.
- No tracking.
- No data collected by the developer.
- Item photos and management numbers stay on the user's device.

The app includes `ios/App/App/PrivacyInfo.xcprivacy` and declares UserDefaults required-reason API usage.

Static public pages included in the build:

- Privacy Policy: `public/privacy.html`
- Support: `public/support.html`
- GitHub Pages source: `docs/privacy.html` and `docs/support.html`

Final public URLs for App Store Connect:

- Privacy Policy URL: `https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html`
- Support URL: `https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html`

Verify the URLs before submission:

```bash
npm run appstore:public-urls
```

## Accessibility

Use [app-accessibility-answers.md](app-accessibility-answers.md) for Accessibility Nutrition Labels. Print the current conservative transfer packet with:

```bash
npm run appstore:accessibility
```

Do not claim an accessibility feature in App Store Connect until the uploaded TestFlight build has been tested against the relevant common tasks on a physical iPhone.

Print the physical iPhone TestFlight evidence packet with:

```bash
npm run appstore:testflight-packet
```

## Review Notes

Use [app-store-review-answers.md](app-store-review-answers.md) for App Review information, age rating assumptions, export compliance notes, content rights notes, and final manual checks.

Use [app-age-rating-answers.md](app-age-rating-answers.md) for the age rating questionnaire. Print the current age rating packet with:

```bash
npm run appstore:rating
```

Suggested review note:

```text
Charm ID can be used without login. On the first screen, tap "デモデータで試す" to load sample item models, then use the Identify and Library tabs to review the matching flow. Camera access is used only to capture item photos for registration and identification. The current build stores item photos, management numbers, and correction history locally on the device.
```

## Screenshots

Development screenshot references are documented in [app-store-screenshots.md](app-store-screenshots.md).

Regenerate the development review set with:

```bash
npm run appstore:screenshots
```

Generate App Store submission-size review assets with:

```bash
npm run appstore:screenshots:submission
```

Print the generated screenshot evidence packet with:

```bash
npm run appstore:screenshot-packet
```

`npm run appstore:audit` also regenerates the development screenshot set before validating image dimensions and file size.

Final App Store screenshots still need to be reviewed against the release build before submission. The repository can now generate 6.9 inch `1320 x 2868` and 6.5 inch `1242 x 2688` portrait JPEG sets that match accepted App Store screenshot dimensions.

Recommended final screenshot set:

1. Onboarding and demo start.
2. Six-angle registration.
3. Identification capture.
4. Candidate ranking and correction.
5. Library detail with learned examples.

## Binary

Before archiving, install the [App Store Readiness GitHub Actions template](github-actions-app-store-readiness.md) and confirm the workflow is green on the release commit.

Print the current Xcode archive evidence packet with:

```bash
npm run appstore:xcode-packet
```

Archive from Xcode after running:

```bash
npm install
npm run appstore:status
npm run appstore:xcode-packet
npm run ios:sync
npm run appstore:audit
open ios/App/App.xcodeproj
```

Use Xcode Organizer to upload the archive to App Store Connect. Follow the manual upload flow in [xcode-app-store-upload-guide.md](xcode-app-store-upload-guide.md).

Before submitting for App Review, complete [app-review-final-signoff.md](app-review-final-signoff.md) and confirm `npm run appstore:status` reports `0 todo`.
Generate the current signoff draft with `npm run appstore:signoff-draft`.
Generate the final signoff application command with `npm run appstore:signoff-command`, replace the placeholders, then run it only after the manual App Review checks are complete.

## App Store Connect Entry Checklist

Use this table as the direct entry map for App Store Connect.

| App Store Connect field | Value or source |
| --- | --- |
| Name | `Charm ID` |
| Subtitle | `小物を撮影して管理番号を確認` |
| Bundle ID | `com.wcf.charmid` |
| SKU | `charm-id-ios` |
| Primary language | Japanese |
| Copyright | Run `npm run appstore:signoff-template`, replace `copyright-holder`, then copy that value. |
| Category | Business |
| Secondary category | Productivity |
| Age rating expectation | 4+ |
| Age rating questionnaire | Use [app-age-rating-answers.md](app-age-rating-answers.md) or run `npm run appstore:rating`. |
| Privacy Policy URL | `https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html` |
| Support URL | `https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html` |
| Promotional text | Run `npm run appstore:metadata` and copy `japaneseListing.promotionalText`. |
| Description | Run `npm run appstore:metadata` and copy `japaneseListing.description`. |
| Keywords | Run `npm run appstore:metadata` and copy `japaneseListing.keywords`. |
| What's New | Run `npm run appstore:metadata` and copy `japaneseListing.whatsNew`. |
| Full transfer packet | Run `npm run appstore:connect-packet`. |
| Screen-by-screen submission checklist | Run `npm run appstore:submission-checklist`. |
| Submission preflight packet | Run `npm run appstore:preflight`. |
| Screenshot evidence packet | Run `npm run appstore:screenshot-packet` after `npm run appstore:screenshots:submission`. |
| Xcode upload steps | Use [xcode-app-store-upload-guide.md](xcode-app-store-upload-guide.md) and run `npm run appstore:xcode-packet`. |
| Final signoff draft | Run `npm run appstore:signoff-draft`. |
| Final signoff apply command | Run `npm run appstore:signoff-command`, replace placeholders, then run the printed command after all manual checks pass. |
| App Review notes | Use [app-store-review-answers.md](app-store-review-answers.md). |
| TestFlight notes | Use [release-notes.md](release-notes.md). |
| App Privacy answers | Use [app-privacy-answers.md](app-privacy-answers.md). |
| Accessibility Nutrition Labels | Use [app-accessibility-answers.md](app-accessibility-answers.md) or run `npm run appstore:accessibility`. |
| TestFlight evidence packet | Run `npm run appstore:testflight-packet` after upload to map physical iPhone QA results into final signoff fields. |
| Export compliance | No custom cryptography; confirm in App Store Connect before upload/submission. |

## Current Blocking Items

- Full Xcode is not active on this Mac, so archive/upload validation cannot run here yet.
- Apple Developer Program team must be selected in Xcode.
- App Store Connect app record must be created.
- Formal support and privacy contacts must be added to the public pages.
- Final screenshots must be captured from the release build.
- Final App Review signoff must be completed in [app-review-final-signoff.md](app-review-final-signoff.md).
- GitHub Pages is live from `pages-docs /docs`; confirm with `npm run appstore:public-urls` before submission.
