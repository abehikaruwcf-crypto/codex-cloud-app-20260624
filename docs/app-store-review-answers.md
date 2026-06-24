# App Store Review Answers Draft

This draft collects App Store Connect fields that are separate from product-page metadata and privacy labels.

## App Review Information

- Sign-in required: No
- Demo account required: No
- Reviewer path:
  1. Launch the app.
  2. Tap `デモデータで試す`.
  3. Open `登録一覧` to inspect registered demo models.
  4. Open `撮影して識別` to review matching candidates.
  5. Confirm a candidate to test the human-confirmed learning loop.
- Notes for reviewer:

```text
Charm ID can be used without login. The first-run screen includes demo data so review can test registration, identification, candidate review, and local-only learning without photographing a real item. Camera access is used only for item registration and identification. The app does not upload item photos, management numbers, or correction history in the current build.
```

## Age Rating Draft

Expected rating: 4+

Current content assumptions:

- No user-generated public content.
- No social networking.
- No web browsing surface beyond app-hosted privacy/support pages.
- No gambling, contests, alcohol, tobacco, medical, or financial advice.
- No unrestricted internet access.
- Camera access is limited to item photos for registration and identification.

## Export Compliance Draft

Current answer basis:

- The app does not include custom cryptography.
- The app does not provide VPN, secure messaging, password management, cryptocurrency, or other encryption-centered features.
- Any encryption used by the runtime is standard platform or web transport behavior from iOS/WebKit/Capacitor dependencies.

Before submission, confirm the final App Store Connect export compliance questions against the release binary and Apple Developer account settings.

## Content Rights Draft

- The app includes generated demo images created for this project.
- No third-party trademarks, media, or licensed catalog data are included in the app bundle.
- Users provide their own item photos and management numbers.

## Support URL

Required before submission:

- Public support URL.
- Public privacy policy URL.
- Developer contact path for support requests.

The repository currently includes `public/privacy.html` and a GitHub Pages deployment template. Add a public support page or external support URL before App Review submission.

## Final Manual Checks

- Select the Apple Developer Program team in Xcode.
- Create the App Store Connect app record.
- Enter the final Support URL and Privacy Policy URL.
- Capture final screenshots at Apple-supported sizes from the release build.
- Upload a TestFlight build and run physical iPhone validation before App Review.
