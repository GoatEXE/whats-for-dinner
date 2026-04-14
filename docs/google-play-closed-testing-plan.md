# Google Play Closed Testing Plan

## Objective
Distribute the mobile app through Google Play closed testing so testers install a real Android release build from Play, not Expo Go or manual sideloads.

## Current Repo State
Relevant facts from the repo today:

- Mobile app config exists in `apps/mobile/app.json`
- Android package is already set: `com.whatsfordinner.app`
- App name is already set: `What's for Dinner?`
- The app is local-first/offline-only today, with no sign-in or cloud sync
- There is currently no `eas.json`
- There are no committed Android release artifacts or keystores in the repo
- Branding is incomplete:
  - existing: `apps/mobile/assets/favicon.svg`, placeholder `apps/mobile/assets/splash-icon.png`
  - missing: production app icon, adaptive icon foreground, store graphics, screenshots
- CI does not currently build a Play-ready release artifact

## Recommendation
Use this rollout path:

1. **Internal testing** for us first
2. **Closed testing** for external testers second
3. Delay any full public launch planning until at least one stable closed-testing cycle is complete

## Phase 0, Product and Release Decisions
### Decide and lock
- Final Android app name
- Final package identity, keeping `com.whatsfordinner.app` unless there is a strong reason to change it now
- Support email address
- Privacy-policy hosting location
- Versioning strategy for `version` and Android `versionCode`
- Whether Android share-intent is in-scope for the first tester wave or deferred until after beta install stability is confirmed

### Acceptance criteria
- App identity is stable before store setup and signing are finalized

## Phase 1, Google Play Console Setup
### Tasks
- Create or confirm Google Play Console access
- Create the app entry in Play Console
- Set organization/contact details
- Decide the tester-management approach:
  - email allowlist
  - Google Groups
  - opt-in link for closed track

### Notes
Google Play usually requires a cleaner, more complete listing than ad hoc APK sharing. Plan for store metadata even in closed testing.

## Phase 2, Branding and Store Assets
### Required assets
- App icon, 1024x1024 PNG
- Android adaptive icon foreground, 1024x1024 PNG
- Splash artwork for the app itself
- Play Store icon, 512x512
- Feature graphic, 1024x500
- Phone screenshots from the real app

### Repo work
- Add real native assets under `apps/mobile/assets/`
- Update `apps/mobile/app.json` to reference final icon/adaptive icon/splash assets
- Replace the placeholder splash image

### Recommendation
Do this early. Closed testing is technically possible without perfect polish, but testers form opinions immediately from icon, name, and screenshots.

## Phase 3, Release Build Pipeline
### Goal
Produce a signed Android App Bundle (`.aab`) suitable for Play Console upload.

### Tasks
- Add `eas.json` for repeatable Expo Application Services builds
- Define at least:
  - an internal/preview profile
  - a production/store profile
- Configure Android signing strategy
- Decide whether credentials are managed by Expo or provided manually
- Add documented release commands to the repo
- Confirm `apps/mobile/app.json` versioning is compatible with Play uploads

### Suggested output
- `eas build --platform android --profile preview` for internal validation
- `eas build --platform android --profile production` for Play track uploads

### Acceptance criteria
- One command path reliably produces a Play-uploadable `.aab`

## Phase 4, Store Listing and Policy Work
### Tasks
- Write short and full app descriptions
- Set app category and contact details
- Publish a privacy policy at a stable public URL
- Complete Play Console declarations honestly:
  - Data safety
  - Content rating
  - App access, if applicable
  - Ads declaration
  - Target audience

### App-specific note
Because the app is currently local-first and offline-only, policy answers may be simpler, but they still need to be completed carefully. Do not guess.

## Phase 5, Release QA
### Test the release build, not Expo Go
Smoke-test a signed build installed like a real tester would receive it.

### Minimum QA checklist
- First launch seeds demo data correctly
- Data persists across relaunches
- This week / next week planning works
- Shopping list generation works
- Import/export works
- Dark mode persists
- App icon/splash look correct on device
- Update/install flow works between two beta builds
- Any native-only feature claimed in the tester instructions actually works in the release build

### Recommendation
Treat Android share-intent as optional for the first testing wave unless release-build validation is already complete.

## Phase 6, Internal Testing Track
### Tasks
- Upload the first build to Play internal testing
- Install it ourselves from Play
- Verify install/update behavior and obvious device-specific issues
- Fix any release-only bugs before inviting outside testers

### Exit criteria
- We trust the Play delivery path enough to open external testing

## Phase 7, Closed Testing Rollout
### Tasks
- Create the closed testing track
- Add testers or publish the opt-in link
- Send a short tester packet with:
  - install link
  - supported-device note
  - what to test first
  - known limitations, especially local-only/no-sync behavior
  - feedback channel

### Suggested tester guidance
- This build is local-first and currently does not sync across devices
- Test install, first launch, planning flow, shopping list, import/export, and persistence
- Report device model, Android version, and exact repro steps for bugs

## Phase 8, Beta Feedback Loop
### Tasks
- Collect tester feedback in one place
- Track crash/install issues separately from UX feedback
- Ship at least one follow-up beta build to prove the update pipeline
- Define go/no-go criteria for wider rollout

## Repo Changes Likely Needed
- `apps/mobile/app.json` updates for final branding and versioning
- `apps/mobile/assets/` additions for icon/adaptive icon/store-ready artwork
- New `eas.json`
- README/docs updates for tester install and release process
- Possibly CI updates if you want automated release validation or EAS integration

## Risks
- **Branding gap**: placeholder assets will make the test build look unfinished
- **No release pipeline yet**: without EAS config, every build step is ad hoc
- **Policy blocking**: privacy policy and Play declarations can delay rollout even when the app itself works
- **Release-only bugs**: Expo Go success does not guarantee release-build success
- **Identity churn**: changing package/app identity late creates avoidable rework

## Exit Criteria
- The app is uploadable to Google Play as a signed `.aab`
- Store listing, graphics, and policy declarations are complete enough for closed testing
- Testers can install from Play successfully
- At least one tester build and one follow-up update have been delivered through Play
- The release process is documented and repeatable

## Recommended Immediate Next Actions
1. Lock app identity and tester-support email
2. Create real icon/splash/store artwork
3. Add `eas.json` and produce the first signed Android `.aab`
4. Create the Play Console app entry and complete required listing/policy fields
5. Run internal testing before inviting external testers
