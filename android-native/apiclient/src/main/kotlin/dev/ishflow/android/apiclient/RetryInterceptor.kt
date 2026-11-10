package dev.ishflow.android.apiclient

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

class RetryInterceptor(private val maxAttempts: Int = DEFAULT_MAX_ATTEMPTS) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var attempts = 0
        var lastException: Throwable? = null
        while (attempts < maxAttempts) {
            try {
                val response = chain.proceed(chain.request())
                if (response.code in SERVER_ERROR_RANGE && attempts < maxAttempts - 1) {
                    response.close()
                    Thread.sleep(backoffMs(attempts + 1))
                    attempts++
                    continue
                }
                return response
            } catch (e: IOException) {
                lastException = e
                attempts++
                if (attempts >= maxAttempts) throw e
                Thread.sleep(backoffMs(attempts))
            }
        }
        throw lastException ?: IOException("retry exhausted")
    }

    private fun backoffMs(attempt: Int): Long = (BASE_BACKOFF_MS * (1L shl (attempt - 1))).coerceAtMost(MAX_BACKOFF_MS)

    private companion object {
        const val DEFAULT_MAX_ATTEMPTS = 5
        const val BASE_BACKOFF_MS = 1000L
        const val MAX_BACKOFF_MS = 16000L
        val SERVER_ERROR_RANGE = 500..599
    }
}
