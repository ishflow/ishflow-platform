package dev.ishflow.android.core

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import dev.ishflow.android.core.db.IshflowDatabase
import dev.ishflow.android.core.db.CatalogRecordDao
import dev.ishflow.android.core.db.MIGRATION_1_2
import dev.ishflow.android.core.db.MIGRATION_2_3
import dev.ishflow.android.core.db.PendingMutationDao
import dev.ishflow.android.core.db.PendingMutationEntity
import dev.ishflow.android.core.db.PushNotificationDao
import dev.ishflow.android.apiclient.PushTokenProvider
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CoreModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): IshflowDatabase =
        Room.databaseBuilder(context, IshflowDatabase::class.java, "ishflow.db")
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
            .build()

    @Provides
    fun providePendingMutationDao(db: IshflowDatabase): PendingMutationDao = db.pendingMutationDao()

    @Provides
    fun provideCatalogRecordDao(db: IshflowDatabase): CatalogRecordDao = db.catalogRecordDao()

    @Provides
    fun providePushNotificationDao(db: IshflowDatabase): PushNotificationDao = db.pushNotificationDao()

    @Provides
    @Singleton
    fun providePushTokenProvider(impl: FirebasePushTokenProvider): PushTokenProvider = impl

    @Provides
    @Singleton
    fun provideMutationSender(): MutationSender = NoopMutationSender

    @Provides
    @Singleton
    fun provideRefreshTrigger(): RefreshTrigger = RefreshTrigger()
}

private object NoopMutationSender : MutationSender {
    override suspend fun send(mutation: PendingMutationEntity): Unit =
        throw NotImplementedError("Real sender wired in later milestone")
}
