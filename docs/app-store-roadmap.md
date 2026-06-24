# App Store Roadmap

## Target

Publish Charm ID as an App Store-quality iPhone app for camera-based identification and management of small items, charms, accessories, and parts.

## Distribution Goal

Initial target: public App Store release.

Possible later variants:

- Public App Store app for general item/charm management.
- Apple Business Manager Custom App for private company-specific deployments.

## Current State

- React/Vite mobile web app.
- Six-angle capture protocol.
- Human-confirmed self-learning loop.
- Local device storage.
- Capacitor iOS wrapper is being introduced.

## Release-Quality Gaps

### Product

- Generalize copy from only "charms" to small item/charm management where helpful.
- Add onboarding for first-time users.
- Add empty states and recovery flows.
- Add dataset reset/import.
- Add clear limitations around prototype matching.

### Data and AI

- Move from color-signature prototype matching to image embeddings or a server-side model.
- Store confirmed usage examples separately from original registration images.
- Add cloud backup/sync before production release.
- Add safeguards against wrong confirmations poisoning the model.

### iOS

- Confirm final Bundle ID.
- Add app icons and launch screen.
- Add camera/photo usage descriptions.
- Build and run from Xcode.
- Test on physical iPhone.
- Prepare TestFlight build.

### App Store

- Apple Developer Program membership.
- App Store Connect app record.
- App name, subtitle, description, keywords, category.
- Screenshots for required device sizes.
- Privacy policy URL.
- App privacy answers.
- Demo account or review instructions if login is required.

## Proposed Milestones

1. iOS wrapper and native project setup.
2. App Store-ready UX pass.
3. Data import/export and reset flows.
4. Real image similarity layer.
5. Cloud storage and account model.
6. TestFlight release.
7. App Store submission.
