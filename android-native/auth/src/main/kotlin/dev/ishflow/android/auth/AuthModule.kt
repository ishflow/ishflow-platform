package dev.ishflow.android.auth

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import dev.ishflow.android.apiclient.TokenProvider
import dev.ishflow.android.apiclient.UnauthorizedHandler
import javax.inject.Provider
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AuthModule {

    @Provides
    @Singleton
    fun provideTokenStore(@ApplicationContext context: Context): TokenStore = TokenStore(context)

    @Provides
    @Singleton
    fun provideTokenProvider(store: TokenStore): TokenProvider = object : TokenProvider {
        override fun get(): String? = store.getToken()

        // TODO: once /api/mobile/auth/refresh (or a Clerk SDK integration) lands, replace this
        //  with the real refresh call. Returning null today makes TokenRefreshAuthenticator fall
        //  back to a one-shot retry with the same token, which absorbs transient backend 401
        //  blips but does NOT recover from genuinely-expired tokens.
        override suspend fun forceRefresh(): String? = null
    }

    @Provides
    @Singleton
    fun provideAuthFlow(clerkAuthFlow: ClerkAuthFlow): AuthFlow = clerkAuthFlow

    @Provides
    @Singleton
    fun provideUnauthorizedHandler(tokenStore: TokenStore, authFlow: Provider<AuthFlow>): UnauthorizedHandler =
        UnauthorizedHandler {
            if (tokenStore.hasToken()) {
                tokenStore.clearToken()
                authFlow.get().signOut()
            }
        }
}
