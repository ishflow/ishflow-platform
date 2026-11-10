package dev.ishflow.android.core.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.core.R
import dev.ishflow.android.core.Reachability
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/**
 * Process-wide overlay pill that surfaces offline state to the user.
 *
 * Mirrors the iOS `ConnectivityCapsule` (see
 * `ios-native/.../Features/Offline/ConnectivityCapsule.swift`): when the
 * device drops off the network the pill slides in from above; when
 * connectivity returns it slides away.
 *
 * The capsule reads from [Reachability] through a tiny [HiltViewModel]
 * wrapper so the composable stays free of Hilt constructor wiring — the
 * established pattern for shell-level composables in this module.
 */
@HiltViewModel
class ConnectivityCapsuleViewModel @Inject constructor(
    reachability: Reachability,
) : ViewModel() {
    val online: StateFlow<Boolean> = reachability.observe()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS),
            initialValue = true,
        )

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}

@Composable
fun ConnectivityCapsule(
    modifier: Modifier = Modifier,
    viewModel: ConnectivityCapsuleViewModel = hiltViewModel(),
) {
    val online by viewModel.online.collectAsStateWithLifecycle()
    AnimatedVisibility(
        visible = !online,
        enter = slideInVertically { -it } + fadeIn(),
        exit = slideOutVertically { -it } + fadeOut(),
        modifier = modifier,
    ) {
        Surface(
            color = MaterialTheme.colorScheme.errorContainer,
            contentColor = MaterialTheme.colorScheme.onErrorContainer,
            shape = MaterialTheme.shapes.large,
            tonalElevation = 4.dp,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(Icons.Filled.WifiOff, contentDescription = null)
                Text(stringResource(R.string.connectivity_offline))
            }
        }
    }
}
