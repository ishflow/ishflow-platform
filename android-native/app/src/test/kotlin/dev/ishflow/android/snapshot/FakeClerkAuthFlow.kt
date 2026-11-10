package dev.ishflow.android.snapshot

import android.content.Context
import android.net.Uri
import dev.ishflow.android.auth.AuthCallbackResult
import dev.ishflow.android.auth.AuthFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class FakeClerkAuthFlow(signedIn: Boolean) : AuthFlow {
    private val _signedIn = MutableStateFlow(signedIn)
    override val signedIn: StateFlow<Boolean> = _signedIn

    @Suppress("EmptyFunctionBlock")
    override fun launchSignIn(context: Context) {}

    @Suppress("EmptyFunctionBlock")
    override fun launchSignUp(context: Context) {}
    override fun handleCallback(uri: Uri): AuthCallbackResult = AuthCallbackResult.Success("fake-token")
    override fun signOut() {
        _signedIn.value = false
    }
    override fun isSignedIn(): Boolean = _signedIn.value
    override fun signInDevOverride() {
        _signedIn.value = true
    }
}
