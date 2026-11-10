package dev.ishflow.android.core.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CatalogRecordDao {
    @Query(
        "SELECT * FROM catalog_record " +
            "WHERE tenant_id = :tenantId AND entity = :entity " +
            "ORDER BY display_name COLLATE NOCASE",
    )
    fun observe(tenantId: String, entity: String): Flow<List<CatalogRecordEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(records: List<CatalogRecordEntity>)

    @Query("DELETE FROM catalog_record WHERE tenant_id = :tenantId AND entity = :entity")
    suspend fun clear(tenantId: String, entity: String)

    @Query("DELETE FROM catalog_record")
    suspend fun clearAll()
}
