package dev.ishflow.android.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Outbox
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SyncProblem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.auth.biometric.BiometricStore
import dev.ishflow.android.core.privacy.PrivacyStore
import dev.ishflow.android.core.rbac.Permissions
import dev.ishflow.android.core.session.SessionStore
import dev.ishflow.android.feature.settings.sections.PrivacySection
import dev.ishflow.android.feature.settings.sections.SecuritySection
import javax.inject.Inject
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Cached visibility flags for [SettingsRootScreen]'s admin-only rows.
 *
 * The ViewModel reads [SessionStore] synchronously rather than refetching
 * `/me`. Empty grants fail open (the row stays visible) so an unprovisioned
 * session keeps the existing surface area.
 */
@HiltViewModel
class SettingsRootViewModel @Inject constructor(
    sessionStore: SessionStore,
    private val privacyStore: PrivacyStore,
    private val biometricStore: BiometricStore,
) : ViewModel() {
    val isAdmin: StateFlow<Boolean> = sessionStore.me
        .map {
            val granted = it?.permissions?.toSet() ?: emptySet()
            Permissions.any(granted, ADMIN_ROW_PERMS)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), true)

    val analyticsEnabled: StateFlow<Boolean> = privacyStore.analyticsEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), true)

    val diagnosticsEnabled: StateFlow<Boolean> = privacyStore.diagnosticsEnabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), true)

    val biometricEnabled: StateFlow<Boolean> = biometricStore.enabled
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), false)

    fun setAnalytics(enabled: Boolean) {
        viewModelScope.launch { privacyStore.setAnalytics(enabled) }
    }

    fun setDiagnostics(enabled: Boolean) {
        viewModelScope.launch { privacyStore.setDiagnostics(enabled) }
    }

    fun setBiometric(enabled: Boolean) {
        viewModelScope.launch { biometricStore.set(enabled) }
    }

    private companion object {
        val ADMIN_ROW_PERMS = listOf("admin.tenant:read", "admin.members:read")
        const val STOP_TIMEOUT_MS = 5_000L
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun SettingsRootScreen(
    onNavigate: (String) -> Unit,
    onSignOut: () -> Unit,
    viewModel: SettingsRootViewModel = hiltViewModel(),
) {
    val analyticsEnabled by viewModel.analyticsEnabled.collectAsStateWithLifecycle()
    val diagnosticsEnabled by viewModel.diagnosticsEnabled.collectAsStateWithLifecycle()
    val biometricEnabled by viewModel.biometricEnabled.collectAsStateWithLifecycle()
    var showLanguageSheet by remember { mutableStateOf(false) }
    var showThemeSheet by remember { mutableStateOf(false) }
    var showDashboardStyleSheet by remember { mutableStateOf(false) }
    Scaffold(
        topBar = {
            LargeTopAppBar(
                title = { Text(stringResource(R.string.settings_title)) },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
        ) {
            item {
                PrivacySection(
                    analyticsEnabled = analyticsEnabled,
                    diagnosticsEnabled = diagnosticsEnabled,
                    onAnalyticsToggle = viewModel::setAnalytics,
                    onDiagnosticsToggle = viewModel::setDiagnostics,
                )
            }
            item {
                SecuritySection(
                    biometricEnabled = biometricEnabled,
                    onBiometricToggle = viewModel::setBiometric,
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_profile),
                    icon = Icons.Filled.Person,
                    onClick = { onNavigate("settings/profile") },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_row_account),
                    icon = Icons.Filled.AccountCircle,
                    onClick = { onNavigate("settings/account") },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_notifications),
                    icon = Icons.Filled.Notifications,
                    onClick = { onNavigate("settings/notifications") },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_sync_errors),
                    icon = Icons.Filled.SyncProblem,
                    onClick = { onNavigate("settings/syncErrors") },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_outbox),
                    icon = Icons.Filled.Outbox,
                    onClick = { onNavigate("settings/outbox") },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_language),
                    icon = Icons.Filled.Language,
                    onClick = { showLanguageSheet = true },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_theme),
                    icon = Icons.Filled.DarkMode,
                    onClick = { showThemeSheet = true },
                )
            }
            item {
                SettingsRow(
                    label = stringResource(R.string.settings_dashboard_style),
                    icon = Icons.Filled.Dashboard,
                    onClick = { showDashboardStyleSheet = true },
                )
            }
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    FilledTonalButton(
                        onClick = onSignOut,
                        colors = androidx.compose.material3.ButtonDefaults.filledTonalButtonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.onErrorContainer,
                        ),
                    ) {
                        Text(stringResource(R.string.settings_sign_out))
                    }
                }
            }
        }
    }
    if (showLanguageSheet) {
        LanguageSheet(onDismiss = { showLanguageSheet = false })
    }
    if (showThemeSheet) {
        ThemeSheet(onDismiss = { showThemeSheet = false })
    }
    if (showDashboardStyleSheet) {
        DashboardStyleSheet(onDismiss = { showDashboardStyleSheet = false })
    }
}

@Composable
private fun SettingsRow(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(label) },
        leadingContent = { Icon(icon, contentDescription = label) },
        trailingContent = {
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
        },
        modifier = Modifier.clickable { onClick() },
    )
}
