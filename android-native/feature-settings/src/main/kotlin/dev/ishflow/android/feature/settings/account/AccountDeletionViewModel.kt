package dev.ishflow.android.feature.settings.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.auth.AuthFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Returns true if [throwable] is a Retrofit HttpException with HTTP code 409.
 * Uses reflection to avoid a compile-time retrofit2 dependency in this module
 * (retrofit is only an `implementation` dep of :apiclient, not exposed as API).
 */
private fun isHttp409(throwable: Throwable): Boolean {
    if (throwable.javaClass.name != "retrofit2.HttpException") return false
    return try {
        val codeMethod = throwable.javaClass.getMethod("code")
        codeMethod.invoke(throwable) == 409
    } catch (_: Exception) {
        false
    }
}

sealed interface AccountDeletionUiState {
    data object Idle : AccountDeletionUiState
    data object ConfirmingDeletion : AccountDeletionUiState
    data object Deleting : AccountDeletionUiState
    data class Error(val message: String, val isSoleOwner: Boolean = false) : AccountDeletionUiState
    data object Deleted : AccountDeletionUiState
}

@HiltViewModel
class AccountDeletionViewModel @Inject constructor(
    private val api: ApiService,
    private val authFlow: AuthFlow,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AccountDeletionUiState>(AccountDeletionUiState.Idle)
    val uiState: StateFlow<AccountDeletionUiState> = _uiState.asStateFlow()

    fun startConfirmation() {
        _uiState.value = AccountDeletionUiState.ConfirmingDeletion
    }

    fun cancel() {
        _uiState.value = AccountDeletionUiState.Idle
    }

    fun confirmDelete() {
        _uiState.value = AccountDeletionUiState.Deleting
        viewModelScope.launch {
            runCatching {
                api.deleteAccount()
            }.onSuccess {
                authFlow.signOut()
                _uiState.value = AccountDeletionUiState.Deleted
            }.onFailure { throwable ->
                // Detect HTTP 409 from Retrofit's HttpException without a compile-time
                // dependency on retrofit2 in this module: check the class name and
                // call code() via reflection.
                val isSoleOwner = isHttp409(throwable)
                _uiState.value = AccountDeletionUiState.Error(
                    message = throwable.message.orEmpty(),
                    isSoleOwner = isSoleOwner,
                )
            }
        }
    }
}
