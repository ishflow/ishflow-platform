package dev.ishflow.android.core.ui

import androidx.annotation.StringRes
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Process-wide bus that lets any ViewModel surface a snackbar through the
 * single [androidx.compose.material3.SnackbarHost] hosted by `MainScaffold`.
 *
 * ViewModels emit via [show] / [showRes]; the shell collects [events] and
 * forwards each request to its `SnackbarHostState`. The bus is a
 * `MutableSharedFlow` with a small replay buffer so emissions issued while
 * the shell is recomposing are not lost.
 */
@Singleton
class AppSnackbarController @Inject constructor() {

    private val _events = MutableSharedFlow<SnackbarRequest>(extraBufferCapacity = 4)
    val events = _events.asSharedFlow()

    /** Fire-and-forget snackbar with a pre-formatted message. */
    suspend fun show(message: String) {
        _events.emit(SnackbarRequest.Text(message))
    }

    /** Fire-and-forget snackbar with a string resource id and format args. */
    suspend fun showRes(@StringRes res: Int, vararg args: Any) {
        _events.emit(SnackbarRequest.Resource(res, args.toList()))
    }
}

/** One snackbar event flowing through [AppSnackbarController.events]. */
sealed interface SnackbarRequest {
    data class Text(val message: String) : SnackbarRequest
    data class Resource(@StringRes val res: Int, val args: List<Any>) : SnackbarRequest
}
