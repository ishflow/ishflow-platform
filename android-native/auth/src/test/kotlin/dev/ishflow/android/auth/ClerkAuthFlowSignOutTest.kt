package dev.ishflow.android.auth

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.apiclient.PushTokenProvider
import dev.ishflow.android.appshared.models.PushUnregisterRequest
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import kotlin.test.assertFalse

class ClerkAuthFlowSignOutTest {

    private val tokenStore = mockk<TokenStore>(relaxed = true)
    private val api = mockk<ApiService>(relaxed = true)

    private fun flow(tokenProvider: PushTokenProvider, testScope: TestScope): ClerkAuthFlow =
        ClerkAuthFlow(
            tokenStore = tokenStore,
            api = api,
            pushTokenProvider = tokenProvider,
            baseUrl = "https://example.com",
            testScope = testScope,
        )

    @Test
    fun `signOut calls unregisterPush with the current FCM token`() = runTest {
        val provider = PushTokenProvider { "test-fcm-token" }
        every { tokenStore.getToken() } returns "jwt"
        val subject = flow(provider, this)

        subject.signOut()

        // Let all coroutines launched inside signOut() complete.
        testScheduler.advanceUntilIdle()

        coVerify(exactly = 1) {
            api.unregisterPush(PushUnregisterRequest(token = "test-fcm-token", platform = "android"))
        }
    }

    @Test
    fun `signOut clears local state even when unregisterPush throws`() = runTest {
        val provider = PushTokenProvider { "test-fcm-token" }
        coEvery { api.unregisterPush(any()) } throws RuntimeException("network error")
        every { tokenStore.getToken() } returns "jwt"
        val subject = flow(provider, this)

        subject.signOut()

        testScheduler.advanceUntilIdle()

        // Local state is cleared regardless of network failure.
        verify { tokenStore.clearToken() }
        assertFalse(subject.isSignedIn())
    }

    @Test
    fun `signOut skips unregisterPush when FCM token is null`() = runTest {
        val provider = PushTokenProvider { null }
        every { tokenStore.getToken() } returns "jwt"
        val subject = flow(provider, this)

        subject.signOut()

        testScheduler.advanceUntilIdle()

        coVerify(exactly = 0) { api.unregisterPush(any()) }
        verify { tokenStore.clearToken() }
    }
}
