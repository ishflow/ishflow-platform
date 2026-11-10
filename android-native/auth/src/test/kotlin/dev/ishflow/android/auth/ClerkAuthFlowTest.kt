package dev.ishflow.android.auth

import android.net.Uri
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.apiclient.PushTokenProvider
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Locks the deep-link contract for invite-origin tokens. An invitation that
 * routes through the web bridge mints the SAME `ishflow://auth/callback?token=`
 * deep link as the regular mobile sign-in, so `handleCallback` must accept it
 * identically: extract the token and persist it via [TokenStore].
 *
 * `android.net.Uri` is an Android-framework stub under plain JVM unit tests
 * (this module has no Robolectric), so the callback URI is mocked with MockK —
 * mirroring the mockk-based style of [ClerkAuthFlowSignOutTest].
 */
class ClerkAuthFlowTest {

    private val tokenStore = mockk<TokenStore>(relaxed = true)
    private val api = mockk<ApiService>(relaxed = true)
    private val pushTokenProvider = PushTokenProvider { null }

    private fun flow(): ClerkAuthFlow =
        ClerkAuthFlow(
            tokenStore = tokenStore,
            api = api,
            pushTokenProvider = pushTokenProvider,
            baseUrl = "https://example.com",
        )

    private fun callbackUri(
        token: String?,
        host: String = "auth",
        path: String = "/callback",
    ): Uri = mockk {
        every { scheme } returns "ishflow"
        every { this@mockk.host } returns host
        every { this@mockk.path } returns path
        every { getQueryParameter("token") } returns token
    }

    @Test
    fun `handleCallback rejects a foreign host or path - finding G-And1`() {
        val subject = flow()
        val foreignHost = subject.handleCallback(callbackUri("abc", host = "evil"))
        val foreignPath = subject.handleCallback(callbackUri("abc", path = "/steal"))
        assertTrue(foreignHost is AuthCallbackResult.InvalidScheme)
        assertTrue(foreignPath is AuthCallbackResult.InvalidScheme)
        verify(exactly = 0) { tokenStore.setToken(any()) }
    }

    @Test
    fun `handleCallback stores an invite-origin token`() {
        val captured = slot<String>()
        every { tokenStore.setToken(capture(captured)) } returns Unit
        val subject = flow()

        val result = subject.handleCallback(callbackUri("abc"))

        assertTrue(result is AuthCallbackResult.Success)
        assertEquals("abc", (result as AuthCallbackResult.Success).token)
        assertEquals("abc", captured.captured)
        verify(exactly = 1) { tokenStore.setToken("abc") }
        assertTrue(subject.isSignedIn())
    }
}
