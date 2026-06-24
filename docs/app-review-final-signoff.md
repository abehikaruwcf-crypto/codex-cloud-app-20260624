# App Review Final Signoff

Status: Pending

Use this page as the final evidence checklist before submitting Charm ID for App Review.

Change `Status: Pending` to `Status: Ready for App Review` only after every evidence item below is complete and verified on the release build.

## Required Evidence

- Full Xcode selected and `xcodebuild -version` reports Xcode.
- Apple Developer Program team selected in the Xcode `App` target.
- App Store Connect app record exists for Bundle ID `com.wcf.charmid`.
- Final hosted Privacy Policy URL opens publicly and includes a concrete privacy contact such as a `mailto:` link, email address, or telephone contact.
- Final hosted Support URL opens publicly and includes a concrete support contact such as a `mailto:` link, email address, or telephone contact.
- Final App Store screenshots are captured from the release build at Apple-supported sizes.
- TestFlight build is uploaded and processed in App Store Connect.
- Physical iPhone TestFlight validation completed against the uploaded build.
- Exported backup from the release build validates with `npm run backup:validate -- <exported-backup.json>` and imports successfully on a physical iPhone.
- App Privacy answers from [app-privacy-answers.md](app-privacy-answers.md) match the uploaded build.
- App Review notes from [app-store-review-answers.md](app-store-review-answers.md) are entered in App Store Connect.
- `npm run appstore:evidence` has been generated on the release commit and reviewed against this signoff page.
- `npm run appstore:status` reports `0 todo`.
- `npm run appstore:audit` reports `0 fail`.
- `npm run appstore:verify -- --strict` passes on the release commit.

## Signoff Notes

- Release commit:
- Evidence report generated:
- App Store Connect app ID:
- Uploaded build:
- TestFlight device:
- Backup validation file:
- Backup validation result:
- Backup import result:
- Strict verification result:
- Final Privacy Policy URL: https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html
- Final Support URL: https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html
- Support contact:
- Privacy contact:
- Signoff owner:
- Signoff date:

## TODO Resolution Inputs

Fill these values before changing the status to `Status: Ready for App Review`.

When the final contacts and public URLs are known, apply them with:

```bash
npm run appstore:apply-inputs -- --support-contact support@example.com --privacy-contact privacy@example.com --privacy-url https://example.com/privacy.html --support-url https://example.com/support.html
```

| TODO | Required input | Target file or place |
| --- | --- | --- |
| Formal support contact | A concrete `mailto:` link, email address, or telephone contact for app support. | `public/support.html` |
| Privacy policy contact | A concrete `mailto:` link, email address, or telephone contact for privacy inquiries. | `public/privacy.html` |
| Hosted privacy/support URLs | Final public URLs for `/privacy.html` and `/support.html` after GitHub Pages or another host is enabled. | `docs/github-pages-workflow.md`, App Store Connect, and this signoff page |
| Full Xcode selected | Output of `xcodebuild -version` after selecting full Xcode. | This signoff page |
| Final App Review signoff | Filled release commit, App Store Connect app ID, uploaded build, physical iPhone TestFlight result, final URLs, contacts, owner, and date. | This signoff page |
