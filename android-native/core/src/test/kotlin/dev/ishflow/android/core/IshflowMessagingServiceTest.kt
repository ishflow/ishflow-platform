package dev.ishflow.android.core

import com.google.firebase.messaging.RemoteMessage
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

class IshflowMessagingServiceTest {

    @Test
    @Disabled("Requires Hilt test setup for @AndroidEntryPoint service")
    fun `onMessageReceived with refresh true fires trigger with zero interval`() {
        val service = IshflowMessagingService()
        val refreshTrigger: RefreshTrigger = mockk(relaxed = true)

        IshflowMessagingService::class.java.getDeclaredField("refreshTrigger").apply {
            isAccessible = true
            set(service, refreshTrigger)
        }

        val message: RemoteMessage = mockk()
        io.mockk.every { message.data } returns mapOf("refresh" to "true")

        service.onMessageReceived(message)

        verify { refreshTrigger.fire(minIntervalMillis = 0L) }
    }

    @Test
    @Disabled("Requires Hilt test setup for @AndroidEntryPoint service")
    fun `onMessageReceived without refresh does not fire trigger`() {
        val service = IshflowMessagingService()
        val refreshTrigger: RefreshTrigger = mockk(relaxed = true)

        IshflowMessagingService::class.java.getDeclaredField("refreshTrigger").apply {
            isAccessible = true
            set(service, refreshTrigger)
        }

        val message: RemoteMessage = mockk()
        io.mockk.every { message.data } returns mapOf("other" to "value")

        service.onMessageReceived(message)

        verify(exactly = 0) { refreshTrigger.fire(any()) }
    }
}
