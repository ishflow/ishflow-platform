package dev.ishflow.android.core.session

import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.MobileFeatures
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.models.UserSummary
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SessionStoreTest {

    @Test
    fun `session emits tenantId from MeResponse`() = runTest {
        val store = SessionStore()
        store.update(
            MeResponse(
                user = UserSummary("u", "a@b"),
                tenant = TenantSummary("org_1", "s", "n", "USD", MobileFeatures()),
                permissions = emptyList(),
            ),
        )
        assertEquals("org_1", store.tenantId.value)
    }

    @Test
    fun `clear emits null tenantId`() = runTest {
        val store = SessionStore()
        store.update(
            MeResponse(
                user = UserSummary("u", "a@b"),
                tenant = TenantSummary("org_1", "s", "n", "USD", MobileFeatures()),
                permissions = emptyList(),
            ),
        )
        store.clear()
        assertNull(store.tenantId.value)
    }
}
