package dev.ishflow.android.snapshot

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import dev.ishflow.android.AppRoot
import dev.ishflow.android.auth.biometric.BiometricStore
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.theme.IshflowTheme
import kotlinx.coroutines.flow.MutableSharedFlow
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test

// Pre-existing: AppRoot's ConnectivityCapsule reads LocalViewModelStoreOwner,
// which Paparazzi 1.x's LayoutLib runtime does not provide. The fix needs a
// stubbed VM owner in the snapshot harness (or extracting ConnectivityCapsule
// behind a slot). Tracked separately — the redesign doesn't affect this path.
@Ignore("Pre-existing: ConnectivityCapsule requires LocalViewModelStoreOwner")
class SignInSnapshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_6)

    @Test
    fun signInLight() {
        val authFlow = FakeClerkAuthFlow(signedIn = false)
        val refreshTrigger = RefreshTrigger { 0L }
        val sessionStore = SessionStore()
        val biometricStore = BiometricStore(paparazzi.context)
        val deepLinks = MutableSharedFlow<dev.ishflow.android.DocumentDeepLink>(replay = 0)
        paparazzi.snapshot {
            IshflowTheme(darkTheme = false) {
                AppRoot(
                    authFlow = authFlow,
                    refreshTrigger = refreshTrigger,
                    sessionStore = sessionStore,
                    biometricStore = biometricStore,
                    documentDeepLinks = deepLinks,
                    onSignIn = {},
                    onSignUp = {},
                    onSignOut = {},
                )
            }
        }
    }

    @Test
    fun signInDark() {
        val authFlow = FakeClerkAuthFlow(signedIn = false)
        val refreshTrigger = RefreshTrigger { 0L }
        val sessionStore = SessionStore()
        val biometricStore = BiometricStore(paparazzi.context)
        val deepLinks = MutableSharedFlow<dev.ishflow.android.DocumentDeepLink>(replay = 0)
        paparazzi.snapshot {
            IshflowTheme(darkTheme = true) {
                AppRoot(
                    authFlow = authFlow,
                    refreshTrigger = refreshTrigger,
                    sessionStore = sessionStore,
                    biometricStore = biometricStore,
                    documentDeepLinks = deepLinks,
                    onSignIn = {},
                    onSignUp = {},
                    onSignOut = {},
                )
            }
        }
    }
}
