package dev.ishflow.android.appshared.ui

import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.api.ApiException
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/**
 * Guards the body-aware error mapping. R.string.* are Int constants
 * resolved at compile time, so we can assert them in a plain JVM test
 * without Android resources.
 */
class ApiErrorStringsTest {

    @Test
    fun `PERIOD_CLOSED body maps to period_closed string`() {
        val ex = ApiException.Http(
            status = 409,
            body = """{"error":{"code":"PERIOD_CLOSED","message":"period closed"}}""",
        )
        assertEquals(R.string.error_period_closed, ex.stringRes())
    }

    @Test
    fun `unknown error code falls back to HTTP-status mapping`() {
        val ex = ApiException.Http(
            status = 400,
            body = """{"error":{"code":"VALIDATION_FAILED"}}""",
        )
        assertEquals(R.string.error_bad_request, ex.stringRes())
    }

    @Test
    fun `null body falls back to HTTP-status mapping`() {
        val ex = ApiException.Http(status = 404, body = null)
        assertEquals(R.string.error_not_found, ex.stringRes())
    }

    @Test
    fun `malformed JSON body falls back to HTTP-status mapping`() {
        val ex = ApiException.Http(status = 500, body = "not json {{{")
        assertEquals(R.string.error_server, ex.stringRes())
    }

    @Test
    fun `network exception maps to network string regardless of body`() {
        val ex = ApiException.Network(RuntimeException("dns"))
        assertEquals(R.string.error_network, ex.stringRes())
    }
}
