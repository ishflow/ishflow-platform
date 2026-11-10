package dev.ishflow.android.apiclient

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class RetryInterceptorTest {
    private lateinit var server: MockWebServer
    private lateinit var client: OkHttpClient

    @BeforeEach
    fun setUp() {
        server = MockWebServer()
        server.start()
        client = OkHttpClient.Builder()
            .addInterceptor(RetryInterceptor(maxAttempts = MAX_ATTEMPTS))
            .build()
    }

    @AfterEach
    fun tearDown() {
        server.shutdown()
    }

    @Test
    @Suppress("MagicNumber")
    fun `does not retry on 401`() {
        server.enqueue(MockResponse().setResponseCode(401))
        val request = Request.Builder().url(server.url("/")).build()
        val response = client.newCall(request).execute()
        assertEquals(401, response.code)
        assertEquals(1, server.requestCount) // exactly 1 attempt, no retry
    }

    @Test
    @Suppress("MagicNumber")
    fun `retries on 500 up to maxAttempts`() {
        repeat(MAX_ATTEMPTS) { server.enqueue(MockResponse().setResponseCode(500)) }
        val request = Request.Builder().url(server.url("/")).build()
        val response = client.newCall(request).execute()
        assertEquals(500, response.code)
        assertEquals(MAX_ATTEMPTS, server.requestCount) // 3 attempts (initial + 2 retries)
    }

    private companion object {
        const val MAX_ATTEMPTS = 3
    }
}
