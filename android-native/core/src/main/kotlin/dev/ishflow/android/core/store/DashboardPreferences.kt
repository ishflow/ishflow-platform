package dev.ishflow.android.core.store

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
 * User-controlled dashboard preferences that survive app restarts.
 *
 * Currently scoped to a single flag: whether the setup-progress widget has
 * been dismissed via the "Skip" / X buttons. Kept distinct from
 * [DashboardStyleStore] (file: `dashboard_style`) so the two stores don't
 * collide and can evolve independently — style is a layout *picker*,
 * preferences are *dismissed-by-user* flags.
 *
 * Dual constructor mirrors [dev.ishflow.android.core.privacy.PrivacyStore]:
 * the `@Inject` constructor is what Hilt wires in production, while the
 * `internal` constructor lets unit tests substitute an in-memory
 * [DataStore] without standing up an Android `Context`.
 */
@Singleton
class DashboardPreferences internal constructor(
    private val dataStore: DataStore<Preferences>,
) {

    @Inject
    constructor(@ApplicationContext context: Context) : this(context.dashboardPrefsDataStore)

    val setupProgressDismissed: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[KEY_SETUP_PROGRESS_DISMISSED] ?: false
    }

    suspend fun setSetupProgressDismissed(value: Boolean) {
        dataStore.edit { prefs ->
            prefs[KEY_SETUP_PROGRESS_DISMISSED] = value
        }
    }

    internal companion object {
        val KEY_SETUP_PROGRESS_DISMISSED = booleanPreferencesKey("setup_progress_dismissed")
    }
}

private val Context.dashboardPrefsDataStore by preferencesDataStore("dashboard_prefs")
