package dev.ishflow.android.feature.settings

import androidx.annotation.StringRes
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.core.store.DashboardStyle
import dev.ishflow.android.core.store.DashboardStyleStore
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Bottom-sheet picker for [DashboardStyle]. Three radio rows — Hero
 * (Classic), Pastel Bento, Charts — each writing through
 * [DashboardStyleStore] so the dashboard picks up the change instantly via
 * its DataStore-backed flow.
 */
@HiltViewModel
class DashboardStyleViewModel @Inject constructor(
    private val store: DashboardStyleStore,
) : ViewModel() {

    val style: StateFlow<DashboardStyle> = store.style
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), DashboardStyle.HERO)

    fun select(style: DashboardStyle) {
        viewModelScope.launch { store.set(style) }
    }

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }
}

private data class DashboardStyleRow(val style: DashboardStyle, @StringRes val labelRes: Int)

private val DASHBOARD_STYLE_ROWS: List<DashboardStyleRow> = listOf(
    DashboardStyleRow(DashboardStyle.HERO, R.string.dashboard_style_hero),
    DashboardStyleRow(DashboardStyle.PASTEL_BENTO, R.string.dashboard_style_pastel),
    DashboardStyleRow(DashboardStyle.CHARTS, R.string.dashboard_style_charts),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardStyleSheet(
    onDismiss: () -> Unit,
    viewModel: DashboardStyleViewModel = hiltViewModel(),
) {
    val current by viewModel.style.collectAsStateWithLifecycle()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
            DASHBOARD_STYLE_ROWS.forEach { row ->
                val selected = current == row.style
                ListItem(
                    headlineContent = { Text(stringResource(row.labelRes)) },
                    leadingContent = {
                        RadioButton(
                            selected = selected,
                            onClick = null,
                        )
                    },
                    modifier = Modifier.clickable {
                        viewModel.select(row.style)
                        onDismiss()
                    },
                )
            }
        }
    }
}
