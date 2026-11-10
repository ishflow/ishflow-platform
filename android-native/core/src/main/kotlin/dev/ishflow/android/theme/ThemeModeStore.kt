package dev.ishflow.android.theme

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * DataStore-backed persistence for [ThemeMode]. Mirrors [FeatureFlagsStore]'s
 * pattern: a process-singleton `preferencesDataStore` delegate plus a Hilt
 * [Singleton] that exposes a [Flow] for reactive UI binding and a `suspend`
 * setter for writes.
 *
 * Invalid/unknown stored values (e.g. an enum case removed in a later build)
 * silently degrade to [ThemeMode.SYSTEM] so the user always sees a working
 * UI on first launch after upgrade.
 *
 * The primary constructor takes a raw [DataStore] so unit tests can drive
 * the store with an in-memory backing without an Android [Context]. The
 * secondary [@Inject] constructor is what Hilt actually wires in production.
 */
private val Context.themeDataStore: DataStore<Preferences> by preferencesDataStore("theme")

@Singleton
class ThemeModeStore(
    private val dataStore: DataStore<Preferences>,
) {

    /**
     * Production wiring — Hilt provides the application [Context] and the
     * delegate-backed DataStore is reused for the whole process.
     */
    @Inject
    constructor(@ApplicationContext context: Context) : this(context.themeDataStore)

    val mode: Flow<ThemeMode> = dataStore.data.map { prefs ->
        val stored = prefs[KEY_MODE] ?: return@map ThemeMode.SYSTEM
        runCatching { ThemeMode.valueOf(stored) }.getOrDefault(ThemeMode.SYSTEM)
    }

    suspend fun set(mode: ThemeMode) {
        dataStore.edit { prefs ->
            prefs[KEY_MODE] = mode.name
        }
    }

    private companion object {
        val KEY_MODE = stringPreferencesKey("theme_mode")
    }
}
