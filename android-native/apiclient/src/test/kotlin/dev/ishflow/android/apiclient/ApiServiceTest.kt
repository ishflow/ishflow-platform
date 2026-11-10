package dev.ishflow.android.apiclient

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import retrofit2.Retrofit
import kotlin.test.assertEquals

class ApiServiceTest {
    private lateinit var server: MockWebServer
    private lateinit var api: ApiService

    @BeforeEach
    fun setUp() {
        server = MockWebServer()
        server.start()
        val client = OkHttpClient.Builder().build()
        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
        api = retrofit.create(ApiService::class.java)
    }

    @AfterEach
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun getMeParsesResponse() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"user":{"id":"u1","email":"u@e.com"},"tenant":null,"permissions":[]}""",
            ),
        )
        val me = api.getMe()
        assertEquals("u@e.com", me.user.email)
    }

    @Test
    fun `getMe hits correct path`() = runTest {
        server.enqueue(MockResponse().setBody("""{"user":{"id":"u","email":"a@b"},"tenant":null,"permissions":[]}"""))
        api.getMe()
        val req = server.takeRequest()
        assertEquals("/api/mobile/me", req.path)
    }

    @Test
    fun idempotencyKeyHeaderPresentOnPost() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody("""{"movementCount":1}"""),
        )
        // Wire interceptors manually for this test
        val client = OkHttpClient.Builder()
            .addInterceptor(IdempotencyInterceptor())
            .build()
        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
        val withInterceptor = retrofit.create(ApiService::class.java)

        withInterceptor.postDocument("sales.invoice", "abc123")

        val req = server.takeRequest()
        assert(req.getHeader("Idempotency-Key") != null) { "Idempotency-Key missing on POST" }
    }
}
