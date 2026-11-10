# ishflow Android Native

Kotlin + Jetpack Compose + Material 3 Android app. Material You verbatim, min SDK 34.

## Build + Run

```bash
./gradlew :app:assembleDebug
~/Library/Android/sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk
~/Library/Android/sdk/platform-tools/adb shell am start -n dev.ishflow.android/.MainActivity
```


## Firebase setup (optional — required only for live push notifications)

The app builds and runs **without** Firebase. Push notifications are inert
until `google-services.json` is dropped in place; everything else (sign-in,
documents, inventory, sales, sync) works the same.

To enable Firebase Cloud Messaging:

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with `applicationId = dev.ishflow.android` (and the
   `.dev` / `.staging` suffixes for those flavors if you want push there)
3. Download `google-services.json` from Firebase console
4. Place it at `android-native/app/google-services.json` (gitignored)
5. Store the file in 1Password vault `<vault>` as item `<item>`
6. Rebuild: `./gradlew :app:assembleDevDebug`

No manifest or gradle edits required — `app/build.gradle.kts` detects the
file and applies the `google-services` plugin automatically.

While Firebase is absent:

* `FirebaseInitProvider` skips auto-init (a warning is logged to logcat).
* `IshflowMessagingService` callbacks are never invoked because the system
  has no FCM registration to deliver to.
* `PushTokenSender` is never called, so `/api/mobile/push/register` stays
  silent (no spurious server traffic).
* The Kotlin code is defensive — any unexpected Firebase exception is
  caught and logged at `IshflowMessaging` tag rather than crashing the app.
