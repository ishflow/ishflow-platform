package dev.ishflow.android.apiclient

import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class TokenRefreshAuthenticatorTest {
    private lateinit var server: MockWebServer

    @BeforeEach
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @AfterEach
    fun tearDown() {
        server.shutdown()
    }

    private fun clientWith(tokenProvider: TokenProvider, handler: UnauthorizedHandler): OkHttpClient =
        OkHttpClient.Builder()
            .authenticator(TokenRefreshAuthenticator(tokenProvider, handler))
            .build()

    @Test
    @Suppress("MagicNumber")
    fun `single 401 with current token retry succeeds`() {
        val handler = mockk<UnauthorizedHandler>(relaxed = true)
        val tokenProvider = mockk<TokenProvider>()
        every { tokenProvider.get() } returns "current-token"
        coEvery { tokenProvider.forceRefresh() } returns null

        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(200).setBody("{}"))

        val response = clientWith(tokenProvider, handler)
            .newCall(Request.Builder().url(server.url("/x")).build())
            .execute()

        assertEquals(200, response.code)
        assertEquals(2, server.requestCount)
        verify(exactly = 0) { handler.onUnauthorized() }
    }

    @Test
    @Suppress("MagicNumber")
    fun `two consecutive 401s fire onUnauthorized and surface 401`() {
        val handler = mockk<UnauthorizedHandler>(relaxed = true)
        val tokenProvider = mockk<TokenProvider>()
        every { tokenProvider.get() } returns "current-token"
        coEvery { tokenProvider.forceRefresh() } returns null

        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(401))

        val response = clientWith(tokenProvider, handler)
            .newCall(Request.Builder().url(server.url("/x")).build())
            .execute()

        assertEquals(401, response.code)
        verify(exactly = 1) { handler.onUnauthorized() }
    }

    @Test
    @Suppress("MagicNumber")
    fun `forceRefresh non-null is used over cached fallback`() {
        val handler = mockk<UnauthorizedHandler>(relaxed = true)
        val tokenProvider = mockk<TokenProvider>()
        every { tokenProvider.get() } returns "stale-token"
        coEvery { tokenProvider.forceRefresh() } returns "new-token"

        server.enqueue(MockResponse().setResponseCode(401))
        server.enqueue(MockResponse().setResponseCode(200).setBody("{}"))

        val response = clientWith(tokenProvider, handler)
            .newCall(Request.Builder().url(server.url("/x")).build())
            .execute()

        assertEquals(200, response.code)
        // First request: no auth header (we did not install AuthInterceptor here).
        server.takeRequest()
        // Second request: Authenticator-injected header must carry the refreshed token.
        val retried = server.takeRequest()
        assertEquals("Bearer new-token", retried.getHeader("Authorization"))
        verify(exactly = 0) { handler.onUnauthorized() }
    }

    @Test
    @Suppress("MagicNumber")
    fun `null token and 401 fires onUnauthorized`() {
        val handler = mockk<UnauthorizedHandler>(relaxed = true)
        val tokenProvider = mockk<TokenProvider>()
        every { tokenProvider.get() } returns null
        coEvery { tokenProvider.forceRefresh() } returns null

        server.enqueue(MockResponse().setResponseCode(401))

        val response = clientWith(tokenProvider, handler)
            .newCall(Request.Builder().url(server.url("/x")).build())
            .execute()

        assertEquals(401, response.code)
        verify(exactly = 1) { handler.onUnauthorized() }
    }
}
