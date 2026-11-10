package dev.ishflow.android.core

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import dev.ishflow.android.core.db.PushNotificationDao
import dev.ishflow.android.core.db.PushNotificationEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

/**
 * FCM service. Gracefully no-ops if Firebase isn't initialised (e.g. dev
 * builds without `google-services.json`). Without the json the system never
 * delivers messages and `FirebaseInitProvider` skips auto-init, so the
 * callbacks below are never invoked — the try/catch guards are defensive
 * for partial-config edge cases.
 */
@AndroidEntryPoint
class IshflowMessagingService : FirebaseMessagingService() {

    @Inject lateinit var pushTokenSender: PushTokenSender

    @Inject lateinit var refreshTrigger: RefreshTrigger

    @Inject lateinit var pushDao: PushNotificationDao

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @Suppress("TooGenericExceptionCaught")
    override fun onNewToken(token: String) {
        try {
            scope.launch { pushTokenSender.send(token) }
        } catch (t: Throwable) {
            Log.w(TAG, "onNewToken skipped: ${t.message}")
        }
    }

    @Suppress("TooGenericExceptionCaught")
    override fun onMessageReceived(message: RemoteMessage) {
        try {
            super.onMessageReceived(message)
            handleMessage(message)
        } catch (t: Throwable) {
            Log.w(TAG, "onMessageReceived skipped: ${t.message}")
        }
    }

    private fun handleMessage(message: RemoteMessage) {
        if (message.data["refresh"] == "true") {
            refreshTrigger.fire(minIntervalMillis = 0L)
        }
        val notif = message.notification ?: return
        scope.launch {
            pushDao.upsert(
                PushNotificationEntity(
                    id = message.messageId ?: UUID.randomUUID().toString(),
                    title = notif.title.orEmpty(),
                    body = notif.body.orEmpty(),
                    dataJson = encodeData(message.data),
                    receivedAt = System.currentTimeMillis(),
                    readAt = null,
                ),
            )
        }
    }

    private fun encodeData(data: Map<String, String>): String? =
        if (data.isEmpty()) {
            null
        } else {
            Json.encodeToString(
                MapSerializer(String.serializer(), String.serializer()),
                data,
            )
        }

    private companion object {
        const val TAG = "IshflowMessaging"
    }
}
