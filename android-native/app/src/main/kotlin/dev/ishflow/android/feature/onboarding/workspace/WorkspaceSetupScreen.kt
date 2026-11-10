package dev.ishflow.android.feature.onboarding.workspace

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.os.ConfigurationCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.R
import dev.ishflow.android.core.ui.aurora.AuroraBackground
import dev.ishflow.android.core.ui.aurora.AuroraPrimaryButton
import dev.ishflow.android.core.ui.aurora.GlassCard
import dev.ishflow.android.core.ui.aurora.GlassHeadline
import dev.ishflow.android.core.ui.aurora.GlassMark
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Apartment

internal val SUPPORTED_CURRENCIES = listOf("USD", "EUR", "RUB", "KZT", "KGS", "UZS", "TRY")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkspaceSetupScreen(
    onCompleted: (tenantId: String) -> Unit,
    viewModel: WorkspaceSetupViewModel = hiltViewModel(),
) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val canSubmit by viewModel.canSubmit.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // New tenants inherit the user's current app language as their default
    // locale; the backend was previously always seeded "en".
    val appLanguage =
        ConfigurationCompat.getLocales(LocalConfiguration.current)[0]?.language ?: "en"

    val snackbarHostState = remember { SnackbarHostState() }

    // Navigate on success
    LaunchedEffect(uiState) {
        if (uiState is WorkspaceSetupUiState.Success) {
            onCompleted((uiState as WorkspaceSetupUiState.Success).tenantId)
        }
    }

    // Show snackbar on error
    val errorMsg = if (uiState is WorkspaceSetupUiState.Error) {
        stringResource(R.string.onboarding_workspace_error, (uiState as WorkspaceSetupUiState.Error).message)
    } else null
    LaunchedEffect(errorMsg) {
        if (errorMsg != null) snackbarHostState.showSnackbar(errorMsg)
    }

    val dark = isSystemInDarkTheme()
    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = androidx.compose.ui.graphics.Color.Transparent,
    ) { padding ->
        AuroraBackground(dark = dark) {
            Box(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .systemBarsPadding()
                        .padding(horizontal = 22.dp)
                        .padding(top = padding.calculateTopPadding()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(Modifier.weight(1f))
                    GlassMark(
                        icon = Icons.Outlined.Apartment,
                        dark = dark,
                        modifier = Modifier.padding(bottom = 14.dp),
                    )
                    GlassCard(modifier = Modifier.fillMaxWidth(), dark = dark) {
                        GlassHeadline(text = stringResource(R.string.onboarding_workspace_title), dark = dark)

                        Spacer(Modifier.height(16.dp))

                        // Workspace name field
                        OutlinedTextField(
                            value = form.name,
                            onValueChange = viewModel::setName,
                            label = { Text(stringResource(R.string.onboarding_workspace_name_label)) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            enabled = uiState !is WorkspaceSetupUiState.Submitting,
                        )

                        Spacer(Modifier.height(12.dp))

                        // Currency dropdown
                        CurrencyDropdown(
                            selected = form.baseCurrency,
                            onSelected = viewModel::setBaseCurrency,
                            enabled = uiState !is WorkspaceSetupUiState.Submitting,
                        )

                        Spacer(Modifier.height(20.dp))

                        // Submit button
                        AuroraPrimaryButton(
                            text = if (uiState is WorkspaceSetupUiState.Submitting) {
                                stringResource(R.string.onboarding_workspace_creating)
                            } else {
                                stringResource(R.string.onboarding_workspace_create)
                            },
                            onClick = { viewModel.submit(appLanguage) },
                            enabled = canSubmit && uiState !is WorkspaceSetupUiState.Submitting,
                            dark = dark,
                        )
                    }
                    Spacer(Modifier.height(28.dp))
                }

                // Progress overlay while submitting
                if (uiState is WorkspaceSetupUiState.Submitting) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
            }
        }
    }
}

/**
 * Stateless form body used for snapshot tests and previews.
 * Renders the field area + submit button without a Scaffold wrapper.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun WorkspaceSetupContent(
    form: WorkspaceSetupViewModel.Form,
    canSubmit: Boolean,
    uiState: WorkspaceSetupUiState,
    onNameChange: (String) -> Unit = {},
    onCurrencyChange: (String) -> Unit = {},
    onSubmit: () -> Unit = {},
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
        ) {
            OutlinedTextField(
                value = form.name,
                onValueChange = onNameChange,
                label = { Text(stringResource(R.string.onboarding_workspace_name_label)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                enabled = uiState !is WorkspaceSetupUiState.Submitting,
            )
            Spacer(Modifier.height(16.dp))
            CurrencyDropdown(
                selected = form.baseCurrency,
                onSelected = onCurrencyChange,
                enabled = uiState !is WorkspaceSetupUiState.Submitting,
            )
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onSubmit,
                enabled = canSubmit && uiState !is WorkspaceSetupUiState.Submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    if (uiState is WorkspaceSetupUiState.Submitting) {
                        stringResource(R.string.onboarding_workspace_creating)
                    } else {
                        stringResource(R.string.onboarding_workspace_create)
                    },
                )
            }
        }
        if (uiState is WorkspaceSetupUiState.Submitting) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CurrencyDropdown(
    selected: String,
    onSelected: (String) -> Unit,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { if (enabled) expanded = it },
        modifier = Modifier.fillMaxWidth(),
    ) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(stringResource(R.string.onboarding_workspace_currency_label)) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            enabled = enabled,
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            SUPPORTED_CURRENCIES.forEach { currency ->
                DropdownMenuItem(
                    text = { Text(currency) },
                    onClick = {
                        onSelected(currency)
                        expanded = false
                    },
                )
            }
        }
    }
}
