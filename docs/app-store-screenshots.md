# App Store Screenshot Set

Generated development screenshots are stored in:

```text
outputs/app-store-screenshots/
```

Regenerate the current development set with:

```bash
npm run appstore:screenshots
```

The App Store readiness audit also regenerates and validates this set:

```bash
npm run appstore:audit
```

Current set:

1. `01-onboarding.jpg` - first-run explanation and demo data call to action.
2. `02-library.jpg` - six-angle demo models and detail view in the registered library.
3. `03-identify.jpg` - candidate ranking and confirmation flow.
4. `04-register.jpg` - guided six-angle registration flow.

Capture size:

- 390 x 844 CSS viewport
- 3x device scale factor
- 1170 x 2532 generated JPEG output
- iPhone-style mobile viewport

Before App Store submission, final screenshots should be captured from a physical device or simulator at Apple's required screenshot sizes.

The generated set is a repeatable development baseline for App Store Connect copy/design review. Final upload assets should still be re-captured from the release build on an Apple-supported screenshot size.
