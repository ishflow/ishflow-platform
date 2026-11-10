package dev.ishflow.android.apiclient

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ApiModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        // Server may send `null` for fields the model declares with a default
        // (e.g. `linkedInvoices: List<...> = emptyList()` on non-payment docs).
        // Without this, kotlinx.serialization rejects null on non-nullable
        // typed fields even when a default is present.
        coerceInputValues = true
    }

    @Provides
    @Singleton
    fun provideOkHttp(
        tokenProvider: TokenProvider,
        authenticator: TokenRefreshAuthenticator,
        @Named("isDebugBuild") isDebug: Boolean,
    ): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(tokenProvider))
        .authenticator(authenticator)
        .addInterceptor(IdempotencyInterceptor())
        .addInterceptor(RetryInterceptor())
        .apply {
            if (isDebug) {
                addInterceptor(
                    okhttp3.logging.HttpLoggingInterceptor().apply {
                        level = okhttp3.logging.HttpLoggingInterceptor.Level.BODY
                    },
                )
            }
        }
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, json: Json, @Named("apiBaseUrl") baseUrl: String): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService = retrofit.create(ApiService::class.java)

    private const val CONNECT_TIMEOUT_SECONDS = 10L
    // Read/write at 15s timed out on heavy posting transitions (register updates
    // + RLS recalc) when Vercel had a cold start. The user saw the generic
    // "No internet connection" snackbar because Retrofit surfaces
    // SocketTimeoutException with httpCode = null, which our ApiErrorStrings
    // maps to the network message. Bumping to 60s gives Vercel room to warm up
    // without keeping a forever-spinner if the server truly hangs.
    private const val READ_TIMEOUT_SECONDS = 60L
    private const val WRITE_TIMEOUT_SECONDS = 60L
}
