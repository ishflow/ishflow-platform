package dev.ishflow.android.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.theme.ThemeMode

/**
 * Three-option Theme picker — System, Light, Dark — rendered as a Material 3
 * [ModalBottomSheet] so it stacks cleanly above [SettingsRootScreen]. The
 * underlying [ThemeMode] is read from [ThemeSheetViewModel.mode]; selection
 * is fire-and-forget (the ViewModel persists via [dev.ishflow.android.theme.ThemeModeStore]
 * and [MainActivity] recomposes the theme through its own `collectAsState`).
 *
 * The sheet stays open after a pick so the user sees the radio update
 * before dismissing — matches iOS where the option list is the leaf screen
 * and dismissal is explicit.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThemeSheet(
    onDismiss: () -> Unit,
    viewModel: ThemeSheetViewModel = hiltViewModel(),
) {
    val current by viewModel.mode.collectAsStateWithLifecycle()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
            ThemeOption(
                label = stringResource(R.string.theme_system),
                selected = current == ThemeMode.SYSTEM,
                onClick = { viewModel.pick(ThemeMode.SYSTEM) },
            )
            ThemeOption(
                label = stringResource(R.string.theme_light),
                selected = current == ThemeMode.LIGHT,
                onClick = { viewModel.pick(ThemeMode.LIGHT) },
            )
            ThemeOption(
                label = stringResource(R.string.theme_dark),
                selected = current == ThemeMode.DARK,
                onClick = { viewModel.pick(ThemeMode.DARK) },
            )
        }
    }
}

@Composable
private fun ThemeOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(label) },
        leadingContent = {
            RadioButton(selected = selected, onClick = onClick)
        },
        modifier = Modifier.clickable { onClick() },
    )
}
