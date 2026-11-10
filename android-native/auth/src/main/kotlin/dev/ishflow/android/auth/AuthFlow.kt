package dev.ishflow.android.auth

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.flow.StateFlow

interface AuthFlow {
    val signedIn: StateFlow<Boolean>
    fun launchSignIn(context: Context)
    fun launchSignUp(context: Context)
    fun handleCallback(uri: Uri): AuthCallbackResult
    fun signOut()
    fun isSignedIn(): Boolean
    fun signInDevOverride()
}
