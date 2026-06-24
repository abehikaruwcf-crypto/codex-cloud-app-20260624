# Xcode App Store Upload Guide

Use this guide after full Xcode is installed. It covers the manual Apple steps that cannot be completed by the web build or Node scripts.

## 1. Select Full Xcode

Install full Xcode from the Mac App Store if `/Applications/Xcode.app` is missing. After it exists, select it for command line tools:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

Expected result:

- `npm run appstore:xcode-packet` reports `"installed": true`.
- `xcodebuild -version` prints an Xcode version, not the Command Line Tools error.
- `npm run appstore:status` no longer reports `Full Xcode selected` as TODO.

Print the current Xcode archive evidence packet with:

```bash
npm run appstore:xcode-packet
```

Expected result:

- `readyForArchive` is `true` after full Xcode is selected and the project prerequisites are present.
- The packet lists the signoff fields needed after the App Store Connect upload: `app-store-connect-app-id`, `uploaded-build`, and `strict-verification-result`.

## 2. Prepare the Release Commit

Run:

```bash
npm install
npm run appstore:set-version -- 1.0 1
npm run appstore:xcode-packet
npm run appstore:verify
npm run ios:sync
```

When all App Review TODOs are complete, run:

```bash
npm run appstore:verify -- --strict
```

## 3. Open the iOS Project

```bash
open ios/App/App.xcodeproj
```

In Xcode:

- Select the `App` target.
- Confirm Bundle Identifier is `com.wcf.charmid`.
- Select the Apple Developer Program team.
- Keep automatic signing enabled unless the team requires manual profiles.
- Confirm Version is `1.0` and Build is `1`.
- Confirm `PrivacyInfo.xcprivacy` is included in target resources.

## 4. Physical iPhone Test

Run the release build on a physical iPhone before archiving.

Required checks:

- First launch and demo data load.
- Six-angle registration.
- Camera identification.
- Correct candidate confirmation and learning.
- Backup export.
- Backup validation with `npm run backup:validate -- <exported-backup.json>`.
- Backup import after validation.
- Local reset.
- Camera permission denial and recovery guidance.
- Public Support and Privacy links.

Record the device name and backup evidence in [app-review-final-signoff.md](app-review-final-signoff.md).

## 5. Archive and Upload

In Xcode:

- Select `Any iOS Device (arm64)` or a connected physical iPhone.
- Select Product > Archive.
- Wait for Organizer to open.
- Select the archive.
- Click Validate App.
- Click Distribute App.
- Choose App Store Connect.
- Choose Upload.
- Complete signing and upload prompts.

After upload, wait for App Store Connect processing to finish.

## 6. App Store Connect Entry

Use the generated packet:

```bash
npm run appstore:connect-packet
```

Fill:

- App record: `Charm ID`, Bundle ID `com.wcf.charmid`, SKU `charm-id-ios`.
- Privacy Policy URL and Support URL from the packet.
- Japanese listing fields from `appStoreListing`.
- Review notes from `appReview`.
- TestFlight notes from `testFlight`.
- App Privacy answers from [app-privacy-answers.md](app-privacy-answers.md).
- Export compliance: no custom cryptography for the current build.

## 7. Final Gate

Before submitting for App Review:

```bash
npm run appstore:public-urls
npm run appstore:status
npm run appstore:audit
npm run appstore:verify -- --strict
```

Submit only after:

- `npm run appstore:status` reports `0 todo`.
- `npm run appstore:audit` reports `0 fail`.
- `npm run appstore:verify -- --strict` passes.
- [app-review-final-signoff.md](app-review-final-signoff.md) says `Status: Ready for App Review`.
