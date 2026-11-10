package dev.ishflow.android.apiclient

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Supplies the bearer token used by [AuthInterceptor] and [TokenRefreshAuthenticator].
 *
 * - [get] returns the currently cached token (fast, synchronous).
 * - [forceRefresh] asks the auth layer to exchange/refresh the token. Suspending because the
 *   real implementation will eventually hit a network endpoint. Returning `null` signals that
 *   no refresh path is available — callers should fall back gracefully.
 */
interface TokenProvider {
    fun get(): String?
    suspend fun forceRefresh(): String?
}

class AuthInterceptor(private val tokenProvider: TokenProvider) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = tokenProvider.get()
        val newRequest = if (token != null) {
            request.newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            request
        }
        return chain.proceed(newRequest)
    }
}
