# App Store Privacy Answers Draft

Source basis:

- Apple requires developers to provide app privacy practice details in App Store Connect for App Store product pages.
- Apple privacy manifests describe tracking, collected data types, and required reason API usage.
- Apple documentation: https://developer.apple.com/app-store/app-privacy-details/
- Apple documentation: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files

## Current Product Assumption

This draft applies to the current prototype release:

- No account login.
- No cloud sync.
- No analytics SDK.
- No advertising SDK.
- No third-party tracking.
- User-entered item IDs and item photos stay on the device.
- Backup export creates a user-controlled local JSON file.

If cloud sync, analytics, crash reporting, or AI server upload is added, this draft must be updated before submission.

## App Privacy Label Draft

### Data Collection

Recommended answer for the current local-only build:

- Data Collected: No

Rationale:

- Item photos, management numbers, and correction history are stored locally on the user's device.
- The app does not transmit this data to the developer or a third-party service in the current build.

### Tracking

- Tracking: No
- Third-party advertising: No
- Tracking domains: None

### Data Linked to User

- None for the current local-only build.

### Data Not Linked to User

- None for the current local-only build.

## Privacy Manifest

The iOS target includes:

```text
ios/App/App/PrivacyInfo.xcprivacy
```

Current declarations:

- `NSPrivacyTracking`: false
- `NSPrivacyCollectedDataTypes`: empty
- `NSPrivacyAccessedAPITypes`: `NSPrivacyAccessedAPICategoryUserDefaults`
- Required reason: `CA92.1`

## Required Recheck Before Submission

- Confirm whether Capacitor or WebKit dependencies introduce additional required reason APIs.
- Re-run an archive/upload validation from Xcode or Transporter when Xcode is configured.
- Update privacy answers if the app uploads images for cloud matching or model training.
