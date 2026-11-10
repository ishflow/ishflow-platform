package dev.ishflow.android.core

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import dev.ishflow.android.appshared.models.MobileFeatures
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.featureFlagsDataStore by preferencesDataStore("feature_flags")

@Singleton
class FeatureFlagsStore @Inject constructor(@ApplicationContext private val context: Context) {

    val flow: Flow<MobileFeatures> = context.featureFlagsDataStore.data.map { prefs ->
        MobileFeatures(
            sales = prefs[SALES] ?: true,
            prices = prefs[PRICES] ?: true,
            inventory = prefs[INVENTORY] ?: true,
        )
    }

    suspend fun update(features: MobileFeatures) {
        context.featureFlagsDataStore.edit { prefs ->
            prefs[SALES] = features.sales
            prefs[PRICES] = features.prices
            prefs[INVENTORY] = features.inventory
        }
    }

    private companion object {
        val SALES = booleanPreferencesKey("sales")
        val PRICES = booleanPreferencesKey("prices")
        val INVENTORY = booleanPreferencesKey("inventory")
    }
}
