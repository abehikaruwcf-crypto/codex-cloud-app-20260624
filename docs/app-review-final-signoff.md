# App Review Final Signoff

Status: Pending

Use this page as the final evidence checklist before submitting Charm ID for App Review.

Change `Status: Pending` to `Status: Ready for App Review` only after every evidence item below is complete and verified on the release build.

## Required Evidence

- Full Xcode selected and `xcodebuild -version` reports Xcode.
- Apple Developer Program team selected in the Xcode `App` target.
- App Store Connect app record exists for Bundle ID `com.wcf.charmid`.
- Final hosted Privacy Policy URL opens publicly.
- Final hosted Support URL opens publicly and includes the formal support contact.
- Final App Store screenshots are captured from the release build at Apple-supported sizes.
- TestFlight build is uploaded and processed in App Store Connect.
- Physical iPhone TestFlight validation completed against the uploaded build.
- App Privacy answers from [app-privacy-answers.md](app-privacy-answers.md) match the uploaded build.
- App Review notes from [app-store-review-answers.md](app-store-review-answers.md) are entered in App Store Connect.
- `npm run appstore:status` reports `0 todo`.
- `npm run appstore:audit` reports `0 fail`.

## Signoff Notes

- Release commit:
- App Store Connect app ID:
- Uploaded build:
- TestFlight device:
- Final Privacy Policy URL:
- Final Support URL:
- Support contact:
- Signoff owner:
- Signoff date:
