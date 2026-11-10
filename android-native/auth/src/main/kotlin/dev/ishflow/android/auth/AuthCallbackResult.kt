package dev.ishflow.android.auth

sealed interface AuthCallbackResult {
    data class Success(val token: String) : AuthCallbackResult
    data object MissingToken : AuthCallbackResult
    data object InvalidScheme : AuthCallbackResult
}
