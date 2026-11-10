package dev.ishflow.android.appshared.api

import kotlinx.serialization.SerializationException
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.jupiter.api.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ThrowableExtTest {

    @Test
    fun `passes ApiException through unchanged`() {
        val original = ApiException.Http(404, "{}")
        assertEquals(original, original.toApiException())
    }

    @Test
    fun `maps retrofit HttpException to ApiException Http preserving status and body`() {
        val raw = Response.error<Any>(
            418,
            "{\"error\":\"teapot\"}".toResponseBody("application/json".toMediaType()),
        )
        val mapped = HttpException(raw).toApiException()

        assertTrue(mapped is ApiException.Http)
        assertEquals(418, mapped.status)
        assertEquals("{\"error\":\"teapot\"}", mapped.body)
    }

    @Test
    fun `maps IOException to ApiException Network`() {
        val ex = IOException("dns failure")
        val mapped = ex.toApiException()
        assertTrue(mapped is ApiException.Network)
        assertEquals(ex, mapped.throwable)
    }

    @Test
    fun `maps SerializationException to ApiException Decoding`() {
        val ex = SerializationException("bad json")
        val mapped = ex.toApiException()
        assertTrue(mapped is ApiException.Decoding)
        assertEquals(ex, mapped.throwable)
    }

    @Test
    fun `falls back to Network for unknown Throwable`() {
        val ex = RuntimeException("???")
        val mapped = ex.toApiException()
        assertTrue(mapped is ApiException.Network)
    }
}
