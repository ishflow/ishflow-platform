package dev.ishflow.android.apiclient

import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject

/**
 * Handles 401 responses via OkHttp's [Authenticator] hook rather than a blunt interceptor that
 * signs the user out on the first 401 it sees.
 *
 * Why [Authenticator] and not an [okhttp3.Interceptor]:
 *  - OkHttp invokes Authenticator automatically when the server returns 401, walks the
 *    `priorResponse` chain for us, and lets us return a *new* request that gets retried on the
 *    same connection. An interceptor would have to manually re-issue the call.
 *
 * Behavior on 401:
 *  1. Walk `response.priorResponse` to count prior attempts. If we already retried
 *     [MAX_ATTEMPTS] times, give up — call [UnauthorizedHandler.onUnauthorized] and return null
 *     so OkHttp surfaces the 401 to the caller.
 *  2. Ask [TokenProvider.forceRefresh] for a fresh token. If non-null, replay the request with
 *     `Authorization: Bearer <fresh>`.
 *  3. If refresh returns null (no refresh endpoint exists yet), retry exactly once with the
 *     *current* cached token. This absorbs transient sub-second 401 race conditions on the
 *     backend (the actual user-visible bug — random sign-outs once a minute).
 *  4. If even the cached token is null, fire [UnauthorizedHandler.onUnauthorized] and bail.
 *
 * [UnauthorizedHandler.onUnauthorized] is idempotent — AuthModule's binding clears the token
 * only `if (tokenStore.hasToken())`, so being called twice in a tight race is safe.
 *
 * `runBlocking` is safe here because OkHttp dispatches `Authenticator.authenticate` on its own
 * connection-pool thread, not the main thread.
 */
class TokenRefreshAuthenticator @Inject constructor(
    private val tokenProvider: TokenProvider,
    private val unauthorizedHandler: UnauthorizedHandler,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        val attempts = countAttempts(response)
        if (attempts >= MAX_ATTEMPTS) {
            unauthorizedHandler.onUnauthorized()
            return null
        }
        val fresh = runBlocking { tokenProvider.forceRefresh() }
        if (fresh != null) {
            return response.request.newBuilder()
                .header(AUTH_HEADER, "Bearer $fresh")
                .build()
        }
        // Refresh unavailable — retry once with current token to absorb transient backend blips.
        val current = tokenProvider.get() ?: run {
            unauthorizedHandler.onUnauthorized()
            return null
        }
        return response.request.newBuilder()
            .header(AUTH_HEADER, "Bearer $current")
            .build()
    }

    private fun countAttempts(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }

    private companion object {
        const val MAX_ATTEMPTS = 2
        const val AUTH_HEADER = "Authorization"
    }
}
