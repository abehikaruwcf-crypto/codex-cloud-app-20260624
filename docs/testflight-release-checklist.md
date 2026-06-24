# TestFlight Release Checklist

Use this checklist once full Xcode is installed and selected.

## 1. Local Prep

```bash
npm install
npm run appstore:set-version -- 1.0 1
npm run backup:validate -- tests/fixtures/valid-backup.json
npm run appstore:status
npm run ios:sync
npm run appstore:audit
```

The audit should finish with zero failures. The Xcode warning should disappear after full Xcode is active.

If Xcode is installed but the command line still points to Command Line Tools, select Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

## 2. Xcode Project Setup

Open:

```bash
open ios/App/App.xcodeproj
```

In Xcode:

- Select the `App` target.
- Confirm Bundle Identifier: `com.wcf.charmid`.
- Select the Apple Developer team.
- Confirm Signing & Capabilities uses automatic signing unless the team requires manual profiles.
- Set Version to the planned marketing version.
- Increment Build for every upload.
- Prefer updating Version and Build through `npm run appstore:set-version -- <version> <build>` before opening Xcode.
- Confirm the privacy manifest is included in the target resources.

## 3. Device QA

Run on a physical iPhone:

- First launch onboarding.
- Demo data load.
- Register flow with all six required angles.
- Identify flow with one and multiple angles.
- Correct-result selection and learning confirmation.
- Backup export.
- Validate the exported backup JSON with `npm run backup:validate -- <exported-backup.json>`.
- Backup import after CLI validation.
- Reset local data.
- Camera permission denial and retry path.

Record backup evidence:

- Exported backup filename:
- `npm run backup:validate` result:
- Import result on physical iPhone:

## 4. Archive

In Xcode:

- Select `Any iOS Device (arm64)` or a physical device.
- Product > Archive.
- Wait for Organizer to open.
- Validate App.
- Distribute App > App Store Connect > Upload.

## 5. App Store Connect

After processing:

- Create or open the `Charm ID` app record.
- Select the uploaded build.
- Add TestFlight internal testers.
- Add TestFlight notes from [release-notes.md](release-notes.md).
- Fill encryption export compliance.
- Fill App Privacy answers from [app-privacy-answers.md](app-privacy-answers.md).
- Add review notes from [app-store-submission-packet.md](app-store-submission-packet.md).

## 6. Before External TestFlight or App Review

- Replace development placeholder icon if final brand artwork is available.
- Capture final screenshots at required Apple sizes.
- Publish privacy policy URL.
- Complete [app-review-final-signoff.md](app-review-final-signoff.md) and mark `Status: Ready for App Review`.
- Confirm final backup validation evidence is recorded in [app-review-final-signoff.md](app-review-final-signoff.md).
- Confirm `npm run appstore:status` reports `0 todo`.
- Re-run `npm run appstore:audit`.
- Confirm no new SDK or cloud feature changed privacy answers.
