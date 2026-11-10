package dev.ishflow.android.apiclient

import okhttp3.Interceptor
import okhttp3.Response
import java.util.UUID

/**
 * Adds an `Idempotency-Key` header to every write request. Caller-supplied
 * keys are preserved — only requests with no existing key get a fresh UUID.
 * This lets the typed POST endpoints expose `@Header("Idempotency-Key")`
 * parameters for explicit retry without losing the auto-generated default.
 */
class IdempotencyInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.method !in WRITE_METHODS) return chain.proceed(request)
        if (request.header(HEADER) != null) return chain.proceed(request)
        return chain.proceed(
            request.newBuilder()
                .header(HEADER, UUID.randomUUID().toString())
                .build(),
        )
    }

    private companion object {
        const val HEADER = "Idempotency-Key"
        val WRITE_METHODS = setOf("POST", "PUT", "PATCH")
    }
}
