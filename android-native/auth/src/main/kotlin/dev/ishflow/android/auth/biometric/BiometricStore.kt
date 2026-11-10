package dev.ishflow.android.auth.biometric

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.biometricDataStore by preferencesDataStore("biometric")

/**
 * Persists the user's opt-in for the biometric unlock gate.
 *
 * Defaults to `false` so first-launch users never see a biometric prompt;
 * the toggle in Settings → Security flips this flag.
 */
@Singleton
class BiometricStore @Inject constructor(@ApplicationContext private val context: Context) {
    private val key = booleanPreferencesKey("biometric_enabled")
    val enabled: Flow<Boolean> = context.biometricDataStore.data.map { it[key] ?: false }
    suspend fun set(enabled: Boolean) {
        context.biometricDataStore.edit { it[key] = enabled }
    }
}
