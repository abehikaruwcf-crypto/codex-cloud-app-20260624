# App Store Screenshot Set

Generated development screenshots are stored in:

```text
outputs/app-store-screenshots/
```

Regenerate the current development set with:

```bash
npm run appstore:screenshots
```

Generate App Store submission-size review assets with:

```bash
npm run appstore:screenshots:submission
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
5. `05-learning.jpg` - human-confirmed learning success state.

Capture size:

- 390 x 844 CSS viewport
- 3x device scale factor
- 1170 x 2532 generated JPEG output
- iPhone-style mobile viewport

Submission-size output sets:

- `outputs/app-store-screenshots-6-9/` - 1320 x 2868 JPEG output for the 6.9 inch App Store slot.
- `outputs/app-store-screenshots-6-5/` - 1242 x 2688 JPEG output for the 6.5 inch fallback slot.

Apple's screenshot specification currently allows 1 to 10 JPEG, JPG, or PNG screenshots. For iPhone, the 6.9 inch slot accepts 1260 x 2736, 1290 x 2796, and 1320 x 2868 portrait screenshots; the 6.5 inch slot accepts 1284 x 2778 and 1242 x 2688 portrait screenshots and is required if 6.9 inch screenshots are not supplied. Source: Apple Developer, "Screenshot specifications."

Before App Store submission, final screenshots should be captured from a physical device or simulator at Apple's required screenshot sizes.

The generated sets are repeatable baselines for App Store Connect copy/design review. Final upload assets should still be reviewed against the release build before submission.
