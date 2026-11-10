package dev.ishflow.android.apiclient

/**
 * Provides the current FCM/push token for the device.
 * Returns null if Firebase is not initialised or the token is unavailable.
 *
 * The default binding is [dev.ishflow.android.core.FirebasePushTokenProvider].
 * Tests can inject a fake implementation.
 */
fun interface PushTokenProvider {
    suspend fun getToken(): String?
}
