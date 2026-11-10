package dev.ishflow.android.core

import android.os.Build
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.PushPlatform
import dev.ishflow.android.appshared.models.PushRegisterRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PushTokenSender @Inject constructor(private val api: ApiService) {

    @Suppress("TooGenericExceptionCaught", "SwallowedException")
    suspend fun send(token: String) {
        try {
            api.registerPush(
                PushRegisterRequest(
                    token = token,
                    platform = PushPlatform.android,
                    deviceName = Build.MODEL,
                ),
            )
        } catch (t: Throwable) {
            // Swallow: token will retry on next refresh from FirebaseMessagingService.onNewToken
        }
    }
}
