package dev.ishflow.android.core.ui.wizard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.ishflow.android.core.R
import dev.ishflow.android.core.ui.dashedBorder
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Shared chrome for "new document" wizard screens — sales, purchase,
 * payment-received, payment-sent. All four use the same DNA:
 *
 *  - TopAppBar with title + small "Черн." chip ([WizardDraftChip])
 *  - Sticky action row ([WizardStickyActionRow]) — tonal "Save" + filled "Post"
 *  - Sticky total bar ([WizardStickyTotalBar]) — gradient + outlined,
 *    tinted by accent color (primary on sales, primary on purchase, etc.)
 *  - Dashed chip row of fast pickers ([WizardDashedChipRow] / [WizardDashedChip])
 *  - Numbered rows ([WizardNumberedRow]) for required fields (counterparty, …)
 *  - DatePicker dialog ([WizardDatePicker])
 *
 * Each composable is parameterised so wizards can map their own field
 * semantics without forking the visual language.
 */

private val SCREEN_GUTTER = 16.dp

@Composable
fun WizardDraftChip(text: String) {
    Surface(
        shape = RoundedCornerShape(50),
        color = MaterialTheme.colorScheme.secondaryContainer,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}

@Composable
fun WizardStickyActionRow(
    saveLabel: String,
    postLabel: String,
    canSaveDraft: Boolean,
    canPost: Boolean,
    isPosting: Boolean,
    onSaveDraft: () -> Unit,
    onPost: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = SCREEN_GUTTER, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        FilledTonalButton(
            onClick = onSaveDraft,
            enabled = canSaveDraft && !isPosting,
            modifier = Modifier
                .weight(1f)
                .height(38.dp),
            shape = RoundedCornerShape(50),
        ) {
            Text(text = saveLabel, style = MaterialTheme.typography.labelLarge)
        }
        Button(
            onClick = onPost,
            enabled = canPost && !isPosting,
            modifier = Modifier
                .weight(1f)
                .height(38.dp),
            shape = RoundedCornerShape(50),
        ) {
            Text(text = postLabel, style = MaterialTheme.typography.labelLarge)
        }
    }
}

/**
 * Sticky total bar. Caller provides:
 *  - `label` — left text, e.g. "Total, 2 items" or "Сумма прихода"
 *  - `value` — right text, e.g. "1 500,00 с"
 *  - `dim`   — when true (typical "empty" state) the bar fades to ~55%
 *
 * Accent defaults to MaterialTheme primary; payment screens may pass
 * a different colour (e.g. error for outflow) but for now all four
 * surfaces share the primary tint per the chosen variant.
 */
@Composable
fun WizardStickyTotalBar(
    label: String,
    value: String,
    dim: Boolean = false,
    accent: Color = MaterialTheme.colorScheme.primary,
) {
    val alpha = if (dim) 0.55f else 1f
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = SCREEN_GUTTER, vertical = 4.dp)
            .background(
                brush = Brush.linearGradient(
                    listOf(accent.copy(alpha = 0.10f), Color.Transparent),
                ),
                shape = RoundedCornerShape(14.dp),
            )
            .border(
                width = 1.dp,
                color = accent.copy(alpha = 0.20f),
                shape = RoundedCornerShape(14.dp),
            ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = alpha),
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = alpha),
            )
        }
    }
}

/**
 * Single dashed-bordered chip used inside [WizardDashedChipRow]. Three states:
 *  - `hasValue=true`  → primary tint, solid-feeling content
 *  - `hasValue=false` → muted outline-variant, placeholder copy
 *  - `enabled=false`  → no click handler, alpha-faded, dashed; signals
 *    "feature comes later" without removing the affordance.
 *  - `isError=true`   → error tint to match required-but-missing flow
 */
@Composable
fun WizardDashedChip(
    icon: ImageVector,
    text: String,
    hasValue: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isError: Boolean = false,
    enabled: Boolean = true,
) {
    val baseBorder = when {
        !enabled -> MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
        isError -> MaterialTheme.colorScheme.error
        hasValue -> MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
        else -> MaterialTheme.colorScheme.outlineVariant
    }
    val baseContent = when {
        !enabled -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f)
        isError -> MaterialTheme.colorScheme.error
        hasValue -> MaterialTheme.colorScheme.onSurface
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val baseIcon = when {
        !enabled -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.45f)
        isError -> MaterialTheme.colorScheme.error
        hasValue -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val clickModifier = if (enabled) Modifier.clickable(onClick = onClick) else Modifier
    Row(
        modifier = modifier
            .heightIn(min = 38.dp)
            .then(clickModifier)
            .dashedBorder(color = baseBorder, strokeWidth = 1.4.dp)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = baseIcon,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            color = baseContent,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Numbered list row — circle (1, 2, 3 …) + label-above-value + chevron. */
@Composable
fun WizardNumberedRow(
    number: Int,
    label: String,
    value: String?,
    placeholder: String,
    onClick: () -> Unit,
) {
    val filled = !value.isNullOrBlank()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        WizardNumberCircle(number = number, filled = filled)
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = if (filled) value!! else placeholder,
                style = MaterialTheme.typography.bodyLarge,
                color = if (filled) {
                    MaterialTheme.colorScheme.onSurface
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun WizardNumberCircle(number: Int, filled: Boolean) {
    val bg = if (filled) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
    val borderColor = if (filled) Color.Transparent else MaterialTheme.colorScheme.outline
    val fg = if (filled) {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }
    Box(
        modifier = Modifier
            .size(28.dp)
            .background(bg, shape = RoundedCornerShape(50))
            .border(1.dp, borderColor, RoundedCornerShape(50)),
        contentAlignment = Alignment.Center,
    ) {
        if (filled) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = fg,
                modifier = Modifier.size(16.dp),
            )
        } else {
            Text(
                text = number.toString(),
                style = MaterialTheme.typography.labelMedium,
                color = fg,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WizardDatePicker(
    initial: LocalDate,
    onConfirm: (LocalDate) -> Unit,
    onDismiss: () -> Unit,
) {
    val initialMillis = initial.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    val state = rememberDatePickerState(initialSelectedDateMillis = initialMillis)
    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    val millis = state.selectedDateMillis
                    if (millis != null) {
                        val picked = Instant.ofEpochMilli(millis)
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate()
                        onConfirm(picked)
                    } else {
                        onDismiss()
                    }
                },
            ) {
                Text(stringResource(R.string.date_picker_confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.date_picker_cancel))
            }
        },
    ) {
        DatePicker(state = state)
    }
}
