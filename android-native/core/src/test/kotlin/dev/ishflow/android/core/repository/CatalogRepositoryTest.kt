package dev.ishflow.android.core.repository

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.MobileFeatures
import dev.ishflow.android.appshared.models.PaginatedResponse
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.models.UserSummary
import dev.ishflow.android.core.db.CatalogRecordDao
import dev.ishflow.android.core.session.SessionStore
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertEquals

class CatalogRepositoryTest {

    @Test
    fun `refresh upserts items into dao`() = runTest {
        val api = mockk<ApiService>()
        val dao = mockk<CatalogRecordDao>(relaxed = true)
        val session = SessionStore().apply {
            update(
                MeResponse(
                    user = UserSummary("u1", "u@t.com"),
                    tenant = TenantSummary("t1", "tenant1", "Tenant 1", "USD", MobileFeatures()),
                    permissions = emptyList(),
                ),
            )
        }
        val json = Json { ignoreUnknownKeys = true }

        coEvery { api.listCatalog("products", pageSize = 200) } returns
            PaginatedResponse(
                items = listOf(CatalogRecord("p1", name = "Pen", createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH)),
                total = 1,
                page = 1,
                pageSize = 200,
            )

        CatalogRepository(api, dao, session, json).refresh("products")

        coVerify {
            dao.upsertAll(match { it.size == 1 && it[0].displayName == "Pen" })
        }
    }
}
