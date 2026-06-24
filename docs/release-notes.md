# Release Notes

## 1.0.0

Initial App Store/TestFlight release candidate for Charm ID.

### App Store What's New Draft

```text
Initial release of Charm ID. Register small items from six camera angles, identify them from iPhone photos, review candidate matches, and improve local matching with human-confirmed learning examples.
```

### TestFlight Notes Draft

```text
Please test first launch, demo data, six-angle registration, camera-based identification, candidate confirmation, correction learning, backup export/import, local reset, and privacy/support links. The current build stores photos, management numbers, and learning history locally on the device.
```

### Included

- Guided six-angle registration: front, back, right side, left side, top side, and bottom side.
- Camera/photo input for registration and identification.
- Candidate ranking from the local matching engine.
- Human-confirmed learning with confirmation before adding new examples.
- Registered library with search, sorting, and detail view.
- Local JSON backup export/import with validation and replacement confirmation.
- Duplicate management number prevention.
- Local reset and destructive action safeguards.
- Privacy policy and support pages.
- App Store metadata, privacy answers, review answers, screenshot generation, and readiness audit docs.

### Known Release Constraints

- Full Xcode must be selected before archive/TestFlight upload validation.
- Apple Developer Program team selection must be completed in Xcode.
- App Store Connect app record must be created manually.
- Public Privacy Policy and Support URLs must be hosted before App Review.
- Final App Store screenshots should be captured from the release build at Apple-supported sizes.
- Physical iPhone TestFlight validation is still required.
- Matching uses the current local prototype engine and should be reviewed by humans before confirming learning.
