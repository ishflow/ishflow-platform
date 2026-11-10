package dev.ishflow.android.feature.settings

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.appshared.R as SharedR

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    onOpenTenantSwitch: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_profile)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.action_back),
                        )
                    }
                },
            )
        },
    ) { padding ->
        ProfileContent(
            state = state,
            onRetry = viewModel::refresh,
            onOpenTenantSwitch = onOpenTenantSwitch,
            modifier = Modifier.padding(padding),
        )
    }
}

@Composable
internal fun ProfileContent(
    state: ProfileUiState,
    onRetry: () -> Unit,
    onOpenTenantSwitch: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .fillMaxSize(),
    ) {
        when (val s = state) {
            ProfileUiState.Loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            is ProfileUiState.Failed -> ErrorState(
                icon = Icons.Filled.ErrorOutline,
                title = stringResource(s.exception.stringRes()),
                ctaLabel = stringResource(SharedR.string.action_retry),
                onCtaClick = onRetry,
            )
            is ProfileUiState.Loaded -> ProfileLoaded(s, onOpenTenantSwitch)
        }
    }
}

@Composable
private fun ProfileLoaded(state: ProfileUiState.Loaded, onOpenTenantSwitch: () -> Unit) {
    Column(Modifier.padding(16.dp)) {
        val user = state.me.user
        val displayName = buildString {
            if (!user.firstName.isNullOrBlank()) append(user.firstName)
            if (!user.lastName.isNullOrBlank()) {
                if (isNotEmpty()) append(" ")
                append(user.lastName)
            }
        }.ifEmpty { user.email }

        Text(
            displayName,
            style = MaterialTheme.typography.headlineSmall,
        )
        Text(
            user.email,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))
        AssistChip(
            onClick = onOpenTenantSwitch,
            label = { Text(state.me.tenant?.name ?: "—") },
        )
    }
}
