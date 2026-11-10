package dev.ishflow.android.core

import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import dev.ishflow.android.apiclient.PushTokenProvider
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production [PushTokenProvider] backed by FirebaseMessaging.
 *
 * Returns null if Firebase is not initialised (e.g. CI builds without
 * `google-services.json`) so callers can safely skip the unregister call.
 */
@Singleton
class FirebasePushTokenProvider @Inject constructor() : PushTokenProvider {

    @Suppress("TooGenericExceptionCaught")
    override suspend fun getToken(): String? =
        try {
            FirebaseMessaging.getInstance().token.await()
        } catch (t: Throwable) {
            Log.w(TAG, "getToken failed: ${t.message}")
            null
        }

    private companion object {
        const val TAG = "FirebasePushTokenProv"
    }
}
