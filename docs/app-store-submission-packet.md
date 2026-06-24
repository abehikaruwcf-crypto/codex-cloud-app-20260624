# App Store Submission Packet

This packet consolidates the current App Store Connect inputs for the local-only Charm ID release candidate.

## App Identity

- App name: Charm ID
- Bundle ID: `com.wcf.charmid`
- SKU suggestion: `charm-id-ios`
- Primary language: Japanese or English, depending on the target launch market.
- Category: Business
- Secondary category: Productivity
- Age rating expectation: 4+

## Version

- Marketing version: `1.0`
- Build number: `1`
- Release type: Manual release after App Review approval.

## App Store Metadata

Use [app-store-metadata.md](app-store-metadata.md) as the source draft for:

- Subtitle
- Promotional text
- Description
- Keywords
- Review notes

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

## Review Notes

Suggested review note:

```text
Charm ID can be used without login. On the first screen, tap "デモデータで試す" to load sample item models, then use the Identify and Library tabs to review the matching flow. Camera access is used only to capture item photos for registration and identification. The current build stores item photos, management numbers, and correction history locally on the device.
```

## Screenshots

Development screenshot references are documented in [app-store-screenshots.md](app-store-screenshots.md).

Final App Store screenshots still need to be captured from a physical iPhone or iOS Simulator at Apple-required dimensions before submission.

Recommended final screenshot set:

1. Onboarding and demo start.
2. Six-angle registration.
3. Identification capture.
4. Candidate ranking and correction.
5. Library detail with learned examples.

## Binary

Archive from Xcode after running:

```bash
npm install
npm run ios:sync
npm run appstore:audit
open ios/App/App.xcworkspace
```

Use Xcode Organizer to upload the archive to App Store Connect.

## Current Blocking Items

- Full Xcode is not active on this Mac, so archive/upload validation cannot run here yet.
- Apple Developer Program team must be selected in Xcode.
- App Store Connect app record must be created.
- Final screenshots and public privacy policy URL are still required.
