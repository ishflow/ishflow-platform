package dev.ishflow.android.core.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        PendingMutationEntity::class,
        CatalogRecordEntity::class,
        PushNotificationEntity::class,
    ],
    version = 3,
    exportSchema = true,
)
abstract class IshflowDatabase : RoomDatabase() {
    abstract fun pendingMutationDao(): PendingMutationDao
    abstract fun catalogRecordDao(): CatalogRecordDao
    abstract fun pushNotificationDao(): PushNotificationDao
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS catalog_record (
              tenant_id TEXT NOT NULL,
              entity TEXT NOT NULL,
              id TEXT NOT NULL,
              display_name TEXT NOT NULL,
              json_body TEXT NOT NULL,
              updated_at INTEGER NOT NULL,
              PRIMARY KEY (tenant_id, entity, id)
            )
            """.trimIndent(),
        )
    }
}

val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS push_notification (
              id TEXT PRIMARY KEY NOT NULL,
              title TEXT NOT NULL,
              body TEXT NOT NULL,
              data_json TEXT,
              received_at INTEGER NOT NULL,
              read_at INTEGER
            )
            """.trimIndent(),
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_push_received ON push_notification(received_at DESC)")
    }
}
