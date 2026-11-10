package dev.ishflow.android.feature.onboarding.workspace

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.AppLocale
import dev.ishflow.android.appshared.models.CreateWorkspaceRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WorkspaceSetupViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    data class Form(
        val name: String = "",
        val baseCurrency: String = "USD",
    )

    private val _form = MutableStateFlow(Form())
    val form: StateFlow<Form> = _form.asStateFlow()

    val canSubmit: StateFlow<Boolean> = _form
        .map { it.name.isNotBlank() && it.baseCurrency.length == 3 }
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    private val _uiState = MutableStateFlow<WorkspaceSetupUiState>(WorkspaceSetupUiState.Idle)
    val uiState: StateFlow<WorkspaceSetupUiState> = _uiState.asStateFlow()

    fun setName(name: String) {
        _form.update { it.copy(name = name) }
    }

    fun setBaseCurrency(currency: String) {
        _form.update { it.copy(baseCurrency = currency) }
    }

    private fun isFormValid(f: Form) = f.name.isNotBlank() && f.baseCurrency.length == 3

    fun submit(locale: String) {
        if (!isFormValid(_form.value)) return
        val f = _form.value
        _uiState.value = WorkspaceSetupUiState.Submitting
        viewModelScope.launch {
            runCatching {
                api.createWorkspace(
                    CreateWorkspaceRequest(
                        name = f.name,
                        currency = f.baseCurrency,
                        locale = toSupportedLocale(locale),
                    ),
                )
            }
                .onSuccess { resp ->
                    _uiState.value = WorkspaceSetupUiState.Success(
                        tenantName = f.name,
                        tenantId = resp.tenantId,
                    )
                }
                .onFailure { _uiState.value = WorkspaceSetupUiState.Error(it.message.orEmpty()) }
        }
    }

    /**
     * Map the device/app language tag to a backend-supported locale, falling
     * back to "en". Without this a new tenant's defaultLocale was always "en"
     * even for the ~90% Russian-speaking audience.
     */
    private fun toSupportedLocale(tag: String): String =
        runCatching { AppLocale.valueOf(tag) }.getOrNull()?.name ?: "en"
}

sealed interface WorkspaceSetupUiState {
    data object Idle : WorkspaceSetupUiState
    data object Submitting : WorkspaceSetupUiState
    data class Success(val tenantName: String, val tenantId: String) : WorkspaceSetupUiState
    data class Error(val message: String) : WorkspaceSetupUiState
}
