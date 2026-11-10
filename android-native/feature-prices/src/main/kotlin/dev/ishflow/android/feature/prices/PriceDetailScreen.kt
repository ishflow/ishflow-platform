package dev.ishflow.android.feature.prices

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.AppLargeTopBar
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.appshared.R as SharedR

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun PriceDetailScreen(viewModel: PriceDetailViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    PriceDetailScreenContent(
        uiState = uiState,
        onRetry = viewModel::retry,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
internal fun PriceDetailScreenContent(
    uiState: PriceDetailUiState,
    onRetry: () -> Unit,
) {
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()
    val shell = LocalShellActions.current

    val title = when (val state = uiState) {
        is PriceDetailUiState.Loaded -> state.record.name
        else -> stringResource(R.string.price_detail_title)
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            AppLargeTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                scrollBehavior = scrollBehavior,
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is PriceDetailUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is PriceDetailUiState.Failed -> {
                    ErrorState(
                        icon = Icons.Filled.ErrorOutline,
                        title = stringResource(SharedR.string.error_title),
                        message = stringResource(state.exception.stringRes()),
                        ctaLabel = stringResource(SharedR.string.action_retry),
                        onCtaClick = onRetry,
                    )
                }

                is PriceDetailUiState.Loaded -> {
                    val record = state.record

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                    ) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            ListItem(
                                headlineContent = { Text(record.name) },
                                supportingContent = record.code?.let { code ->
                                    { Text("${stringResource(R.string.price_code_label)}: $code") }
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}
