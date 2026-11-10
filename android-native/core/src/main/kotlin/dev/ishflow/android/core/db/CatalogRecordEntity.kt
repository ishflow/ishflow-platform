package dev.ishflow.android.core.db

import androidx.room.ColumnInfo
import androidx.room.Entity

@Entity(
    tableName = "catalog_record",
    primaryKeys = ["tenant_id", "entity", "id"],
)
data class CatalogRecordEntity(
    @ColumnInfo(name = "tenant_id") val tenantId: String,
    val entity: String,
    val id: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    @ColumnInfo(name = "json_body") val jsonBody: String,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)
