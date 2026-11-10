package dev.ishflow.android.core.privacy

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Persists user privacy preferences (analytics + crash diagnostics opt-in/out).
 *
 * Defaults to `true` for both toggles to match the current implicit behaviour
 * (no telemetry is shipped yet, so the default is harmless). When the
 * telemetry sink lands, it MUST gate emission on these flows.
 */
@Singleton
class PrivacyStore internal constructor(
    private val dataStore: DataStore<Preferences>,
) {

    @Inject
    constructor(@ApplicationContext context: Context) : this(context.privacyDataStore)

    val analyticsEnabled: Flow<Boolean> = dataStore.data.map { it[ANALYTICS_KEY] ?: true }
    val diagnosticsEnabled: Flow<Boolean> = dataStore.data.map { it[DIAGNOSTICS_KEY] ?: true }

    suspend fun setAnalytics(enabled: Boolean) {
        dataStore.edit { it[ANALYTICS_KEY] = enabled }
    }

    suspend fun setDiagnostics(enabled: Boolean) {
        dataStore.edit { it[DIAGNOSTICS_KEY] = enabled }
    }

    internal companion object {
        val ANALYTICS_KEY = booleanPreferencesKey("analytics_enabled")
        val DIAGNOSTICS_KEY = booleanPreferencesKey("diagnostics_enabled")
    }
}

private val Context.privacyDataStore by preferencesDataStore("privacy")
