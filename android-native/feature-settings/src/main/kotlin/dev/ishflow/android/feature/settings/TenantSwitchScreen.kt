package dev.ishflow.android.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.flow.collectLatest
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.roleLabelResOrNull
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.appshared.R as SharedR

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TenantSwitchScreen(
    onBack: () -> Unit,
    onSwitched: () -> Unit = onBack,
    viewModel: TenantSwitchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // After a successful switch the new bearer is already wired up; jump
    // straight back to the dashboard so the user doesn't have to manually
    // navigate out of the tenant list.
    LaunchedEffect(viewModel) {
        viewModel.switched.collectLatest { onSwitched() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_tenant)) },
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
        TenantSwitchContent(
            uiState = uiState,
            onRetry = viewModel::refresh,
            onSwitch = viewModel::switch,
            modifier = Modifier.padding(padding),
        )
    }
}

@Composable
internal fun TenantSwitchContent(
    uiState: TenantSwitchUiState,
    onRetry: () -> Unit,
    onSwitch: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize(),
    ) {
        when (val state = uiState) {
            is TenantSwitchUiState.Loading -> LoadingIndicator()
            is TenantSwitchUiState.Loaded -> TenantList(state, onSwitch)
            is TenantSwitchUiState.Switching -> SwitchingIndicator()
            is TenantSwitchUiState.Failed -> ErrorState(
                icon = Icons.Filled.ErrorOutline,
                title = stringResource(SharedR.string.error_title),
                message = stringResource(state.exception.stringRes()),
                ctaLabel = stringResource(SharedR.string.action_retry),
                onCtaClick = onRetry,
            )
        }
    }
}

@Composable
private fun LoadingIndicator() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun TenantList(
    state: TenantSwitchUiState.Loaded,
    onSwitch: (String) -> Unit,
) {
    LazyColumn {
        items(state.available) { tenant ->
            TenantItem(
                tenant = tenant,
                isCurrent = tenant.id == state.current?.id,
                onClick = {
                    if (tenant.id != state.current?.id) {
                        onSwitch(tenant.id)
                    }
                },
            )
        }
    }
}

@Composable
private fun SwitchingIndicator() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
        Text(
            stringResource(R.string.switching_tenant),
            modifier = Modifier.padding(top = 16.dp),
        )
    }
}

@Composable
private fun TenantItem(tenant: TenantSummary, isCurrent: Boolean, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(tenant.name) },
        supportingContent = { TenantSupportingRow(tenant) },
        leadingContent = {
            Icon(
                Icons.Filled.Business,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
            )
        },
        trailingContent = {
            if (isCurrent) {
                Icon(
                    Icons.Filled.Check,
                    contentDescription = stringResource(R.string.current_tenant),
                )
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag("tenant_item"),
    )
}

/**
 * Supporting line: `{slug} • {role}` when the server emitted a role, falling
 * back to `{slug}` alone. Unknown role keys are surfaced verbatim so
 * tenant-defined roles aren't hidden from operators.
 */
@Composable
private fun TenantSupportingRow(tenant: TenantSummary) {
    val roleText = tenantRoleLabel(tenant.role)
    val supporting = if (roleText != null) "${tenant.slug} • $roleText" else tenant.slug
    Text(supporting)
}

@Composable
private fun tenantRoleLabel(roleKey: String?): String? {
    if (roleKey.isNullOrBlank()) return null
    val res = roleLabelResOrNull(roleKey) ?: return roleKey
    return stringResource(res)
}
