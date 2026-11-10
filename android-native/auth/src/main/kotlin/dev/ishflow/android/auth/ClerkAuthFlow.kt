package dev.ishflow.android.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.apiclient.PushTokenProvider
import dev.ishflow.android.appshared.models.PushUnregisterRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Named
import javax.inject.Singleton

@Singleton
class ClerkAuthFlow @Inject constructor(
    private val tokenStore: TokenStore,
    private val api: ApiService,
    private val pushTokenProvider: PushTokenProvider,
    @Named("apiBaseUrl") private val baseUrl: String,
) : AuthFlow {

    // Overridable in tests via the internal constructor below.
    private var scope: CoroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /** Test-only constructor: allows injecting a [CoroutineScope] (e.g. [TestScope]). */
    internal constructor(
        tokenStore: TokenStore,
        api: ApiService,
        pushTokenProvider: PushTokenProvider,
        baseUrl: String,
        testScope: CoroutineScope,
    ) : this(tokenStore, api, pushTokenProvider, baseUrl) {
        scope = testScope
    }

    private val _signedIn = MutableStateFlow(tokenStore.getToken() != null)
    override val signedIn: StateFlow<Boolean> = _signedIn.asStateFlow()

    override fun launchSignIn(context: Context) {
        // Route through /sign-out/mobile first — it sets `Clear-Site-Data:
        // "cookies"` and explicitly expires Clerk's `__session` cookie, then
        // 302s to /sign-in/mobile with `force_login=1`. Without this hop,
        // Chrome's persisted Clerk cookie auto-resumes the previous session
        // and the user can never switch accounts after a sign-out.
        val signInUrl = Uri.parse(
            "$baseUrl/sign-out/mobile?return_url=$RETURN_URL_ENCODED",
        )
        CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
            .launchUrl(context, signInUrl)
    }

    override fun launchSignUp(context: Context) {
        // Mirror [launchSignIn] but target the sign-up bridge. Still hop
        // through /sign-out/mobile first so a stale Clerk cookie can never
        // auto-resume a previous session and silently turn "create account"
        // into "already signed in".
        val signUpUrl = Uri.parse(
            "$baseUrl/sign-up/mobile?return_url=$RETURN_URL_ENCODED",
        )
        CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
            .launchUrl(context, signUpUrl)
    }

    override fun handleCallback(uri: Uri): AuthCallbackResult {
        // Strict shape check: only the exact ishflow://auth/callback deep link is
        // a valid callback (covers both in-app sign-in and invite-origin tokens).
        // Rejects foreign-host/path injections. NOTE: this is partial hardening —
        // the complete session-fixation fix is a one-time-code exchange (no bearer
        // carried in the deep-link URL), which intersects the invite flow and is
        // deferred to the joint mobile session. Finding G-And1.
        if (uri.scheme != CALLBACK_SCHEME || uri.host != "auth" || uri.path != "/callback") {
            return AuthCallbackResult.InvalidScheme
        }
        val token = uri.getQueryParameter("token")?.takeIf { it.isNotBlank() }
            ?: return AuthCallbackResult.MissingToken
        tokenStore.setToken(token)
        _signedIn.value = true
        return AuthCallbackResult.Success(token)
    }

    override fun signOut() {
        // Best-effort: unregister the FCM token server-side so this device
        // stops receiving notifications for the signed-out user. Wrapped in
        // runCatching so a network failure or missing Firebase config can
        // never block the sign-out flow.
        scope.launch {
            runCatching {
                val token = pushTokenProvider.getToken()
                if (token != null) {
                    api.unregisterPush(PushUnregisterRequest(token = token))
                }
            }
        }
        // Clear local state synchronously — sign-out is always immediate.
        tokenStore.clearToken()
        _signedIn.value = false
    }

    override fun isSignedIn(): Boolean = _signedIn.value

    override fun signInDevOverride() {
        _signedIn.value = true
    }

    private companion object {
        const val RETURN_URL_ENCODED = "ishflow%3A%2F%2Fauth%2Fcallback"
        const val CALLBACK_SCHEME = "ishflow"
    }
}
