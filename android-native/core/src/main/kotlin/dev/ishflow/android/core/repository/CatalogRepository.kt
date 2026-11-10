package dev.ishflow.android.core.repository

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.db.CatalogRecordDao
import dev.ishflow.android.core.db.CatalogRecordEntity
import dev.ishflow.android.core.session.SessionStore
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class CatalogRepository @Inject constructor(
    private val api: ApiService,
    private val dao: CatalogRecordDao,
    private val session: SessionStore,
    private val json: Json,
) {
    fun observe(entity: String): Flow<List<CatalogRecord>> = session.tenantId.flatMapLatest { tenantId ->
        if (tenantId == null) {
            flowOf(emptyList())
        } else {
            dao.observe(tenantId, entity).map { rows ->
                rows.mapNotNull { row ->
                    runCatching { json.decodeFromString<CatalogRecord>(row.jsonBody) }.getOrNull()
                }
            }
        }
    }

    suspend fun refresh(entity: String) {
        val tenantId = session.tenantId.value ?: return
        // Server caps catalog pageSize at 100 (mobile-api-contract
        // PaginationQuerySchema). Anything above returns 400.
        val response = api.listCatalog(entity, pageSize = 100)
        dao.upsertAll(
            response.items.map { record ->
                CatalogRecordEntity(
                    tenantId = tenantId,
                    entity = entity,
                    id = record.id,
                    displayName = record.name,
                    jsonBody = json.encodeToString(record),
                    updatedAt = System.currentTimeMillis(),
                )
            },
        )
    }
}
