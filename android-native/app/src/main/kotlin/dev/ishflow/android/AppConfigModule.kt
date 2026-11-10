package dev.ishflow.android

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppConfigModule {
    @Provides
    @Singleton
    @Named("apiBaseUrl")
    fun provideApiBaseUrl(): String = BuildConfig.API_BASE_URL

    @Provides
    @Singleton
    @Named("allowDevSkip")
    fun provideAllowDevSkip(): Boolean = BuildConfig.ALLOW_DEV_SKIP

    @Provides
    @Singleton
    @Named("isDevFlavor")
    fun provideIsDevFlavor(): Boolean = BuildConfig.ALLOW_DEV_SKIP

    @Provides
    @Singleton
    @Named("isDebugBuild")
    fun provideIsDebugBuild(): Boolean = BuildConfig.DEBUG
}
