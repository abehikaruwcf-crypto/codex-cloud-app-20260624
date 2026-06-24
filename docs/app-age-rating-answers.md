# App Age Rating Answers Draft

This draft prepares the App Store Connect age rating questionnaire for the current local-only Charm ID release candidate.

Apple's age rating questionnaire must be answered in App Store Connect before publication. Apple has updated the rating system with 4+, 9+, 13+, 16+, and 18+ ratings and required questions covering in-app controls, capabilities, medical or wellness topics, and violent themes. Charm ID should still be reviewed against the final uploaded build before submission.

## Expected Rating

Expected App Store rating: 4+

Reason:

- The app identifies user-provided physical items from camera photos.
- The current build includes no social, marketplace, web browsing, entertainment, medical, wellness, financial, gambling, or mature-content functionality.
- Demo content is generated for this project and contains no objectionable content.

## Questionnaire Draft

Use these draft answers only if the final release build still matches the current local-only product behavior.

| Area | Draft answer |
| --- | --- |
| Parental controls or content restrictions | No |
| Unrestricted web access | No |
| User-generated public content | No |
| Social networking or user-to-user communication | No |
| Messaging, chat, or media sharing | No |
| Advertising | No |
| In-app purchases | No |
| Contests, sweepstakes, or chance-based activities | No |
| Loot boxes or randomized paid items | No |
| Gambling or simulated gambling | No |
| Alcohol, tobacco, vaping, or drug references | No |
| Medical or wellness topics | No |
| Financial advice, trading, or cryptocurrency features | No |
| Profanity or crude humor | No |
| Mature or suggestive themes | No |
| Sexual content or nudity | No |
| Horror or fear themes | No |
| Cartoon, fantasy, or realistic violence | No |
| Weapons references | No |
| News or current-events content | No |
| Third-party catalog, trademarked, or licensed media bundled in the app | No |

## Capability Notes

- Camera: Yes, used only for item registration and identification photos.
- Photo library selection: Yes if iOS offers it for file/photo input; used only for item registration and identification photos.
- Location: No.
- Account login: No.
- Cloud sync: No.
- Analytics, tracking, or advertising SDK: No.
- External links: Only app-hosted Support and Privacy Policy pages.

## Final Review Checklist

Before App Review submission:

- Confirm the uploaded build has no new cloud, social, marketplace, AI-server, analytics, ads, purchase, or web-browsing functionality.
- Confirm demo images and app screenshots contain no mature or objectionable content.
- Confirm App Store Connect calculates the expected 4+ rating, or document any Apple-calculated difference in [app-review-final-signoff.md](app-review-final-signoff.md).
- Re-run `npm run appstore:connect-packet` after any questionnaire-impacting feature change.
