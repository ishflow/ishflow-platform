package dev.ishflow.android.core.store

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dashboardStyleDataStore by preferencesDataStore("dashboard_style")

/**
 * Layout variant the user picked for the dashboard. Declared in `:core` so
 * [DashboardStyleStore] (also in `:core`) can return it strongly typed
 * without creating a cyclic dependency on the feature-dashboard sources
 * that live in `:app`.
 */
enum class DashboardStyle { HERO, PASTEL_BENTO, CHARTS }

/**
 * Persists the user-selected dashboard layout across launches via
 * Preferences DataStore (file: `dashboard_style`, key: `style`). Default
 * is [DashboardStyle.HERO] — the classic layout the app ships with.
 */
@Singleton
class DashboardStyleStore @Inject constructor(@ApplicationContext private val context: Context) {

    val style: Flow<DashboardStyle> = context.dashboardStyleDataStore.data.map { prefs ->
        prefs[STYLE_KEY]?.let { raw -> runCatching { DashboardStyle.valueOf(raw) }.getOrNull() }
            ?: DashboardStyle.HERO
    }

    suspend fun set(style: DashboardStyle) {
        context.dashboardStyleDataStore.edit { prefs ->
            prefs[STYLE_KEY] = style.name
        }
    }

    private companion object {
        val STYLE_KEY = stringPreferencesKey("style")
    }
}
