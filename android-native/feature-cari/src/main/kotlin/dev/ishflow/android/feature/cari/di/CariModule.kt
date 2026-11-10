package dev.ishflow.android.feature.cari.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import dev.ishflow.android.feature.cari.data.CariRepository
import dev.ishflow.android.feature.cari.data.CariRepositoryImpl
import javax.inject.Singleton

/**
 * Binds the live, Retrofit-backed [CariRepositoryImpl] as the implementation
 * of [CariRepository] for the entire app.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class CariModule {

    @Binds
    @Singleton
    abstract fun bindCariRepository(impl: CariRepositoryImpl): CariRepository
}
