package dev.ishflow.android.shell

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import dev.ishflow.android.appshared.models.TenantSummary
import dev.ishflow.android.appshared.ui.roleLabelResOrNull

private val ROW_INITIAL_DIAMETER = 36.dp

/**
 * Modal bottom sheet that lists every tenant the signed-in user belongs to
 * and lets them switch the active organization in one tap. Mirrors iOS's
 * `OrganizationSwitcherSheet`.
 *
 * Wired into the dashboard's top-bar tenant-initial badge — see
 * `DashboardScreen` for the entry point. Once the API resolves, the
 * snackbar fires from [OrgSwitcherViewModel.switch] and the sheet
 * dismisses via [onDismiss].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrgSwitcherSheet(
    sheetState: SheetState,
    onDismiss: () -> Unit,
    viewModel: OrgSwitcherViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        OrgSwitcherSheetContent(
            state = state,
            onPick = { tenantId -> viewModel.switch(tenantId, onSuccess = onDismiss) },
        )
    }
}

@Composable
internal fun OrgSwitcherSheetContent(
    state: OrgSwitcherState,
    onPick: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 24.dp)) {
        Text(
            text = stringResource(R.string.dashboard_org_switcher_title),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        HorizontalDivider()
        state.memberships.forEachIndexed { index, tenant ->
            if (index > 0) HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
            OrgSwitcherRow(
                tenant = tenant,
                isCurrent = tenant.id == state.current?.id,
                isBusy = state.switching,
                onClick = { onPick(tenant.id) },
            )
        }
    }
}

@Composable
private fun OrgSwitcherRow(
    tenant: TenantSummary,
    isCurrent: Boolean,
    isBusy: Boolean,
    onClick: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(tenant.name) },
        supportingContent = { Text(tenantRoleLabel(tenant.role) ?: tenant.slug) },
        leadingContent = { TenantInitialBubble(name = tenant.name) },
        trailingContent = { OrgSwitcherTrailing(isCurrent = isCurrent, isBusy = isBusy) },
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !isBusy && !isCurrent, onClick = onClick)
            .testTag("org_switcher_row"),
    )
}

@Composable
private fun OrgSwitcherTrailing(isCurrent: Boolean, isBusy: Boolean) {
    when {
        isBusy -> CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
        isCurrent -> Icon(
            Icons.Filled.Check,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
        )
        else -> Spacer(modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun TenantInitialBubble(name: String) {
    val initial = name.trim().firstOrNull()?.uppercase().orEmpty()
    Surface(
        modifier = Modifier.size(ROW_INITIAL_DIAMETER),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
        contentColor = MaterialTheme.colorScheme.primary,
    ) {
        Box(modifier = Modifier.size(ROW_INITIAL_DIAMETER), contentAlignment = Alignment.Center) {
            Text(text = initial, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun tenantRoleLabel(roleKey: String?): String? {
    if (roleKey.isNullOrBlank()) return null
    val res = roleLabelResOrNull(roleKey) ?: return roleKey
    return stringResource(res)
}

