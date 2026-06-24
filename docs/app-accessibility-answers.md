# Accessibility Nutrition Labels Draft

This draft prepares the App Store Connect Accessibility Nutrition Labels entry for Charm ID. It should be reviewed on the uploaded TestFlight build before any accessibility feature is claimed on the product page.

Apple's Accessibility Nutrition Labels let developers indicate supported accessibility features on the App Store product page after evaluating common app tasks against the published criteria. For Charm ID, the common tasks are first launch, demo data load, six-angle registration, camera identification, candidate confirmation, backup export/import, local reset, and support/privacy link access.

## Current Recommendation

Do not claim an accessibility feature until the uploaded TestFlight build has been tested with that feature on a physical iPhone.

Current conservative App Store Connect entry:

| Feature | Draft answer | Evidence or reason |
| --- | --- | --- |
| VoiceOver | Do not claim yet | UI uses native controls and descriptive labels for major actions, but full VoiceOver task testing is still required on the release build. |
| Voice Control | Do not claim yet | Buttons and form labels are mostly explicit, but every common task must be tested with Voice Control before claiming support. |
| Larger Text | Do not claim yet | The app uses responsive web layout, but Dynamic Type-style large text behavior must be tested in the iOS wrapper. |
| Dark Interface | Do not claim yet | The current release has a fixed light interface and no verified dark-mode support. |
| Differentiate Without Color Alone | Do not claim yet | Status and candidate information include text labels, but full task verification is still required. |
| Sufficient Contrast | Do not claim yet | Visual contrast should be checked on final screenshots and a physical iPhone before claiming support. |
| Reduced Motion | Do not claim yet | The app does not rely on heavy animation, but reduced-motion behavior has not been explicitly verified. |
| Captions | Not applicable | The current build does not include video or spoken media content. |
| Audio Descriptions | Not applicable | The current build does not include video content that needs audio descriptions. |

## Release-Build Test Notes

Before updating the App Store product page:

- Test first launch, registration, identification, learning confirmation, backup import/export, reset, and links with VoiceOver.
- Test the same tasks with Voice Control.
- Test with larger system text sizes and confirm important labels, buttons, and status messages are not truncated.
- Check final screenshot states for sufficient contrast.
- Confirm that no important state is communicated by color alone.
- Record the tested features in [app-review-final-signoff.md](app-review-final-signoff.md).

## App Store Connect Entry Guidance

If a feature passes release-build testing, select it in App Store Connect. If it is untested, partially supported, or not relevant, leave it unclaimed for the first release.

Recommended first-release public posture:

- Claim no Accessibility Nutrition Labels until physical iPhone validation is complete.
- Mention no accessibility claims in marketing copy until the claims are verified.
- Revisit this draft before every App Store submission if UI, media, or camera workflows change.
