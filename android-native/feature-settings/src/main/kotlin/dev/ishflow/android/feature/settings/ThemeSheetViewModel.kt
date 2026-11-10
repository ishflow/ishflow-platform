package dev.ishflow.android.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.theme.ThemeMode
import dev.ishflow.android.theme.ThemeModeStore
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * ViewModel for [ThemeSheet]. Surfaces the persisted [ThemeMode] as a
 * StateFlow so the sheet's radio buttons stay in sync across app-process
 * lifetime, and forwards user picks to the store on [viewModelScope] so
 * the sheet can dismiss without waiting for the DataStore write to flush.
 */
@HiltViewModel
class ThemeSheetViewModel @Inject constructor(
    private val store: ThemeModeStore,
) : ViewModel() {

    val mode: StateFlow<ThemeMode> = store.mode.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = ThemeMode.SYSTEM,
    )

    fun pick(mode: ThemeMode) {
        viewModelScope.launch { store.set(mode) }
    }
}
