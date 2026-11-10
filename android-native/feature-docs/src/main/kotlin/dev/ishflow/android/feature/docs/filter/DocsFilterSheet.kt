package dev.ishflow.android.feature.docs.filter

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.pickers.CustomerPickerSheet
import dev.ishflow.android.feature.docs.DocumentKind
import dev.ishflow.android.feature.docs.R
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private val DATE_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)

/**
 * ModalBottomSheet exposing the advanced filter editor for the Docs list.
 *
 * State is held locally — the caller only sees the new [DocsFilterState] when
 * the user taps "Apply", at which point [onApply] fires and the sheet
 * dismisses. "Clear" empties the local state without auto-applying so the
 * user can still tweak before committing.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun DocsFilterSheet(
    initial: DocsFilterState,
    onApply: (DocsFilterState) -> Unit,
    onDismiss: () -> Unit,
) {
    var draft by remember { mutableStateOf(initial) }
    var showFromPicker by remember { mutableStateOf(false) }
    var showToPicker by remember { mutableStateOf(false) }
    var showCounterpartyPicker by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .testTag("docs_filter_sheet"),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                text = stringResource(R.string.docs_filter_title),
                style = MaterialTheme.typography.titleLarge,
            )

            DateRangeSection(
                from = draft.dateFrom,
                to = draft.dateTo,
                onFromClick = { showFromPicker = true },
                onToClick = { showToPicker = true },
            )

            CounterpartySection(
                counterpartyName = draft.counterpartyName,
                onClick = { showCounterpartyPicker = true },
                onClear = {
                    draft = draft.copy(counterpartyId = null, counterpartyName = null)
                },
            )

            AmountRangeSection(
                min = draft.amountMin,
                max = draft.amountMax,
                onMinChange = { draft = draft.copy(amountMin = it) },
                onMaxChange = { draft = draft.copy(amountMax = it) },
            )

            StatusSection(
                selected = draft.statuses,
                onToggle = { status ->
                    val next = draft.statuses.toMutableSet().apply {
                        if (!add(status)) remove(status)
                    }
                    draft = draft.copy(statuses = next)
                },
            )

            KindSection(
                selected = draft.kinds,
                onToggle = { kind ->
                    val next = draft.kinds.toMutableSet().apply {
                        if (!add(kind)) remove(kind)
                    }
                    draft = draft.copy(kinds = next)
                },
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                TextButton(
                    onClick = { draft = DocsFilterState() },
                    modifier = Modifier.testTag("docs_filter_clear"),
                ) {
                    Text(stringResource(R.string.docs_filter_clear))
                }
                Button(
                    onClick = { onApply(draft) },
                    modifier = Modifier.testTag("docs_filter_apply"),
                ) {
                    Text(stringResource(R.string.docs_filter_apply))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    if (showFromPicker) {
        DateRangeDialog(
            initial = draft.dateFrom,
            onConfirm = {
                draft = draft.copy(dateFrom = it)
                showFromPicker = false
            },
            onClear = {
                draft = draft.copy(dateFrom = null)
                showFromPicker = false
            },
            onDismiss = { showFromPicker = false },
        )
    }
    if (showToPicker) {
        DateRangeDialog(
            initial = draft.dateTo,
            onConfirm = {
                draft = draft.copy(dateTo = it)
                showToPicker = false
            },
            onClear = {
                draft = draft.copy(dateTo = null)
                showToPicker = false
            },
            onDismiss = { showToPicker = false },
        )
    }
    if (showCounterpartyPicker) {
        CustomerPickerSheet(
            onCustomerSelected = { customer: CatalogRecord ->
                draft = draft.copy(
                    counterpartyId = customer.id,
                    counterpartyName = customer.name,
                )
                showCounterpartyPicker = false
            },
            onDismiss = { showCounterpartyPicker = false },
        )
    }
}

@Composable
private fun DateRangeSection(
    from: LocalDate?,
    to: LocalDate?,
    onFromClick: () -> Unit,
    onToClick: () -> Unit,
) {
    SectionLabel(text = stringResource(R.string.docs_filter_date_range))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ReadOnlyField(
            value = from?.let { DATE_FORMATTER.format(it) }.orEmpty(),
            label = stringResource(R.string.docs_filter_date_from),
            onClick = onFromClick,
            modifier = Modifier
                .weight(1f)
                .testTag("docs_filter_date_from"),
        )
        ReadOnlyField(
            value = to?.let { DATE_FORMATTER.format(it) }.orEmpty(),
            label = stringResource(R.string.docs_filter_date_to),
            onClick = onToClick,
            modifier = Modifier
                .weight(1f)
                .testTag("docs_filter_date_to"),
        )
    }
}

@Composable
private fun CounterpartySection(
    counterpartyName: String?,
    onClick: () -> Unit,
    onClear: () -> Unit,
) {
    SectionLabel(text = stringResource(R.string.docs_filter_counterparty))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ReadOnlyField(
            value = counterpartyName.orEmpty(),
            label = stringResource(R.string.docs_filter_counterparty),
            onClick = onClick,
            modifier = Modifier
                .weight(1f)
                .testTag("docs_filter_counterparty"),
        )
        if (counterpartyName != null) {
            TextButton(onClick = onClear) {
                Text(stringResource(R.string.docs_filter_clear))
            }
        }
    }
}

@Composable
private fun AmountRangeSection(
    min: BigDecimal?,
    max: BigDecimal?,
    onMinChange: (BigDecimal?) -> Unit,
    onMaxChange: (BigDecimal?) -> Unit,
) {
    SectionLabel(text = stringResource(R.string.docs_filter_amount_range))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DecimalField(
            value = min,
            label = stringResource(R.string.docs_filter_amount_min),
            onChange = onMinChange,
            modifier = Modifier
                .weight(1f)
                .testTag("docs_filter_amount_min"),
        )
        DecimalField(
            value = max,
            label = stringResource(R.string.docs_filter_amount_max),
            onChange = onMaxChange,
            modifier = Modifier
                .weight(1f)
                .testTag("docs_filter_amount_max"),
        )
    }
}

@Composable
private fun StatusSection(
    selected: Set<String>,
    onToggle: (String) -> Unit,
) {
    SectionLabel(text = stringResource(R.string.docs_filter_status))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DocsFilterState.ALL_STATUSES.forEach { status ->
            FilterChip(
                selected = selected.contains(status),
                onClick = { onToggle(status) },
                label = { Text(stringResource(statusLabelRes(status))) },
                modifier = Modifier.testTag("docs_filter_status_$status"),
            )
        }
    }
}

@Composable
private fun KindSection(
    selected: Set<String>,
    onToggle: (String) -> Unit,
) {
    SectionLabel(text = stringResource(R.string.docs_filter_kind))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DocsFilterState.ALL_KINDS.forEach { kind ->
            FilterChip(
                selected = selected.contains(kind.wireId),
                onClick = { onToggle(kind.wireId) },
                label = { Text(stringResource(kind.labelRes)) },
                modifier = Modifier.testTag("docs_filter_kind_${kind.name}"),
            )
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun ReadOnlyField(
    value: String,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = { },
        readOnly = true,
        label = { Text(label) },
        modifier = modifier.clickable(onClick = onClick),
    )
}

@Composable
private fun DecimalField(
    value: BigDecimal?,
    label: String,
    onChange: (BigDecimal?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var text by remember(value) { mutableStateOf(value?.toPlainString().orEmpty()) }
    OutlinedTextField(
        value = text,
        onValueChange = { next ->
            text = next
            val trimmed = next.trim()
            val parsed = if (trimmed.isEmpty()) null else trimmed.toBigDecimalOrNull()
            // Only push back when parseable or cleared — keep partial input
            // visible while the user is still typing.
            if (parsed != null || trimmed.isEmpty()) {
                onChange(parsed)
            }
        },
        label = { Text(label) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier,
        singleLine = true,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateRangeDialog(
    initial: LocalDate?,
    onConfirm: (LocalDate) -> Unit,
    onClear: () -> Unit,
    onDismiss: () -> Unit,
) {
    val initialMillis = initial?.atStartOfDay(ZoneOffset.UTC)?.toInstant()?.toEpochMilli()
    val state = rememberDatePickerState(initialSelectedDateMillis = initialMillis)

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = {
                val millis = state.selectedDateMillis
                if (millis != null) {
                    onConfirm(millisToLocalDate(millis))
                } else {
                    onDismiss()
                }
            }) {
                Text(stringResource(R.string.docs_filter_apply))
            }
        },
        dismissButton = {
            TextButton(onClick = onClear) {
                Text(stringResource(R.string.docs_filter_clear))
            }
        },
    ) {
        DatePicker(state = state)
    }
}

private fun millisToLocalDate(epochMillis: Long): LocalDate =
    Instant.ofEpochMilli(epochMillis).atZone(ZoneOffset.UTC).toLocalDate()

private fun statusLabelRes(status: String): Int = when (status) {
    DocsFilterState.STATUS_DRAFT -> R.string.docs_filter_status_draft
    DocsFilterState.STATUS_POSTED -> R.string.docs_filter_status_posted
    DocsFilterState.STATUS_CANCELED -> R.string.docs_filter_status_canceled
    else -> R.string.docs_filter_status
}
