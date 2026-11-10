# Firebase Crashlytics — deferred

Status: **DEFERRED** (waiting on Firebase project + `google-services.json`).

## Why

Task C3 of the 2026-05-11 Android/iOS parity bundle (the internal design spec) calls
for Firebase Crashlytics wired to the in-app privacy gate (`PrivacyStore.diagnosticsEnabled`). The Crashlytics + Google Services
Gradle plugins both require `google-services.json` to be present at build time. That file is **not** checked into the repo at
`android-native/app/google-services.json`, and no Firebase project has been provisioned for this app yet.

Half-wiring the integration (adding the Gradle plugins without the config file, or stubbing the SDK calls) would either break the
`prodDebug` / `prodRelease` builds or silently disable crash reporting in a way that's easy to miss later. Per the parity-bundle
risk register ("Firebase Crashlytics needs `google-services.json` — verify present; if missing, defer Wave C3 + document"), the
correct action is to defer and document.

## What's needed to unblock

1. Create a Firebase project for `dev.canalog.android` in the Firebase console.
2. Register the Android app (package name `dev.canalog.android`, plus any `applicationIdSuffix` variants used by `dev` / `prod`
   build flavors — check `app/build.gradle.kts`).
3. Download `google-services.json` from the Firebase console.
4. Place it at `android-native/app/google-services.json` (root of the `app` module, **not** inside `src/`).
5. Re-run task **C3** from the parity-bundle plan. The integration steps live in the C3 task brief: root `build.gradle.kts`
   plugin classpaths, `app/build.gradle.kts` plugin + Firebase BoM deps, a `CrashlyticsInit` class that observes
   `PrivacyStore.diagnosticsEnabled` and toggles `FirebaseCrashlytics.isCrashlyticsCollectionEnabled`, and wiring it from
   `CanalogApp.onCreate()`.

## Privacy contract (reminder)

When C3 ships, Crashlytics collection must default to **off** until the user opts in via the Privacy section
(`PrivacyStore.diagnosticsEnabled`). No first-launch crash should be sent before the user has had a chance to make that choice.

## Owner

Android app maintainer. Track via the parity-bundle PR's "Deferred" list and re-open C3 when `google-services.json` lands.
