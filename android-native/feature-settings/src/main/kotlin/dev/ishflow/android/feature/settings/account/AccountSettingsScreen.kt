package dev.ishflow.android.feature.settings.account

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.feature.settings.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountSettingsScreen(
    onBack: () -> Unit,
    onAccountDeleted: () -> Unit,
    viewModel: AccountDeletionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is AccountDeletionUiState.Deleted -> onAccountDeleted()
            is AccountDeletionUiState.Error -> {
                if (!state.isSoleOwner) {
                    snackbarHostState.showSnackbar(state.message.ifBlank { "error" })
                }
            }
            else -> Unit
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_account_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.action_back),
                        )
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (uiState == AccountDeletionUiState.Deleting) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                )
                Text(
                    text = stringResource(R.string.settings_account_deleting),
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(top = 80.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                AccountBody(
                    deleting = false,
                    onDeleteClick = viewModel::startConfirmation,
                )
            }
        }
    }

    // Confirmation dialog.
    if (uiState == AccountDeletionUiState.ConfirmingDeletion) {
        AlertDialog(
            onDismissRequest = viewModel::cancel,
            title = { Text(stringResource(R.string.settings_account_delete_confirm_title)) },
            text = { Text(stringResource(R.string.settings_account_delete_confirm_message)) },
            confirmButton = {
                TextButton(
                    onClick = viewModel::confirmDelete,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error,
                    ),
                ) {
                    Text(stringResource(R.string.settings_account_delete))
                }
            },
            dismissButton = {
                TextButton(onClick = viewModel::cancel) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }

    // Sole-owner warning dialog.
    val soleOwnerState = uiState as? AccountDeletionUiState.Error
    if (soleOwnerState != null && soleOwnerState.isSoleOwner) {
        AlertDialog(
            onDismissRequest = viewModel::cancel,
            title = { Text(stringResource(R.string.settings_account_delete_confirm_title)) },
            text = {
                Text(
                    stringResource(
                        R.string.settings_account_delete_sole_owner_warning,
                        extractWorkspaceNames(soleOwnerState.message),
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = viewModel::cancel) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }
}

@Composable
internal fun AccountBody(
    deleting: Boolean,
    onDeleteClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp),
    ) {
        Text(
            text = stringResource(R.string.settings_account_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.weight(1f))

        OutlinedButton(
            onClick = onDeleteClick,
            enabled = !deleting,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error,
            ),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.error,
            ),
        ) {
            Text(stringResource(R.string.settings_account_delete))
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

/**
 * Best-effort extraction of workspace names from a server error message.
 * The server returns a JSON body like:
 *   `{"code":"sole_owner_workspaces","workspaces":[{"id":"...","name":"Acme"}]}`
 * If parsing fails we return a generic fallback label.
 */
private fun extractWorkspaceNames(errorMessage: String): String {
    return try {
        val nameRegex = Regex(""""name"\s*:\s*"([^"]+)"""")
        val names = nameRegex.findAll(errorMessage).map { it.groupValues[1] }.toList()
        if (names.isNotEmpty()) names.joinToString(", ") else errorMessage
    } catch (_: Exception) {
        errorMessage
    }
}
