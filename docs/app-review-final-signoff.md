# App Review Final Signoff

Status: Pending

Use this page as the final evidence checklist before submitting Charm ID for App Review.

Change `Status: Pending` to `Status: Ready for App Review` only after every evidence item below is complete and verified on the release build.

Generate a current copy/paste draft with:

```bash
npm run appstore:signoff-draft
```

Generate a final `appstore:apply-inputs` command with current repository evidence and placeholders for manual App Review values with:

```bash
npm run appstore:signoff-command
```

Generate a JSON final input template with:

```bash
npm run appstore:signoff-template
```

Generate the physical iPhone TestFlight evidence field map with:

```bash
npm run appstore:testflight-packet
```

Generate the App Store screenshot evidence packet with:

```bash
npm run appstore:screenshot-packet
```

Generate the current Xcode archive evidence packet with:

```bash
npm run appstore:xcode-packet
```

Generate the current submission preflight packet with:

```bash
npm run appstore:preflight
```

## Required Evidence

- Full Xcode selected and `xcodebuild -version` reports Xcode.
- Apple Developer Program team selected in the Xcode `App` target.
- App Store Connect app record exists for Bundle ID `com.wcf.charmid`.
- Final hosted Privacy Policy URL opens publicly and includes a concrete privacy contact such as a `mailto:` link, email address, or telephone contact.
- Final hosted Support URL opens publicly and includes a concrete support contact such as a `mailto:` link, email address, or telephone contact.
- `npm run appstore:public-urls` confirms the final Privacy Policy and Support URLs return HTTP 200 and expected page titles.
- Final App Store screenshots are captured from the release build at Apple-supported sizes.
- TestFlight build is uploaded and processed in App Store Connect.
- Xcode archive and upload followed [xcode-app-store-upload-guide.md](xcode-app-store-upload-guide.md).
- Physical iPhone TestFlight validation completed against the uploaded build.
- Age rating answers from [app-age-rating-answers.md](app-age-rating-answers.md) match the uploaded build and App Store Connect result.
- Exported backup from the release build validates with `npm run backup:validate -- <exported-backup.json>` and imports successfully on a physical iPhone.
- App Privacy answers from [app-privacy-answers.md](app-privacy-answers.md) match the uploaded build.
- Accessibility Nutrition Labels from [app-accessibility-answers.md](app-accessibility-answers.md) match the tested release build.
- App Review notes from [app-store-review-answers.md](app-store-review-answers.md) are entered in App Store Connect.
- `npm run appstore:preflight` has been generated and reviewed against the App Store Connect entry screens.
- `npm run appstore:evidence` has been generated on the release commit and reviewed against this signoff page, including the screenshot evidence packet.
- `npm run appstore:evidence-check -- --strict` passes on the release commit.
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
- Public URL verification result:
- Strict verification result:
- Accessibility label result:
- Age rating result:
- Final Privacy Policy URL: https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html
- Final Support URL: https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html
- Support contact:
- Privacy contact:
- Signoff owner:
- Signoff date:

## TODO Resolution Inputs

Fill these values before changing the status to `Status: Ready for App Review`.

To generate a copy/paste command with current commit, public URL verification, and remaining placeholders, run:

```bash
npm run appstore:signoff-command
```

To generate a JSON template for the same values, run:

```bash
npm run appstore:signoff-template
```

After replacing every placeholder in `release-inputs.json`, apply the values with:

```bash
npm run appstore:apply-inputs -- --inputs-file release-inputs.json
```

When the final contacts, public URLs, and release evidence are known, apply them with:

```bash
npm run appstore:apply-inputs -- --support-contact support@example.com --privacy-contact privacy@example.com --privacy-url https://example.com/privacy.html --support-url https://example.com/support.html --release-commit <sha> --evidence-report-generated <iso-date> --app-store-connect-app-id <app-id> --uploaded-build "1.0 (1)" --testflight-device "iPhone model / iOS version" --backup-validation-file <backup.json> --backup-validation-result passed --backup-import-result passed --public-url-verification-result passed --strict-verification-result passed --accessibility-label-result reviewed --age-rating-result "4+ confirmed" --signoff-owner <name> --signoff-date <yyyy-mm-dd>
```

Add `--mark-ready` to the same command only after every required evidence value is complete. The command refuses to mark the page ready while required signoff fields are blank.

| TODO | Required input | Target file or place |
| --- | --- | --- |
| Formal support contact | A concrete `mailto:` link, email address, or telephone contact for app support. | `public/support.html` and `docs/support.html` |
| Privacy policy contact | A concrete `mailto:` link, email address, or telephone contact for privacy inquiries. | `public/privacy.html` and `docs/privacy.html` |
| Full Xcode selected | Output of `xcodebuild -version` after selecting full Xcode. | This signoff page |
| Final App Review signoff | Filled release commit, evidence timestamp, App Store Connect app ID, uploaded build, physical iPhone TestFlight result, backup validation/import result, public URL verification, strict verification, accessibility result, age rating result, final URLs, contacts, owner, and date. | This signoff page |
