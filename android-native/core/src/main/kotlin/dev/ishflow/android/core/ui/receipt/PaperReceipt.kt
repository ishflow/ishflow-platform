package dev.ishflow.android.core.ui.receipt

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Paper receipt design system — used by the POSTED detail screens for sales
 * invoice, payment received, purchase invoice, payment sent.
 *
 * The visual reference is an internal design mockup (not in this repo):
 * a single white "paper" card on a muted page, with monospace body text,
 * dashed bölmeler, a small status pill keyed off doc kind, and either a
 * line-item list (invoices) or a hero amount with allocation rows (payments).
 *
 * Dark mode: the page background stays normal `MaterialTheme.colorScheme.background`
 * but the paper card uses `surfaceContainerLowest` so it still reads as the
 * literal sheet of paper on top of a darker desk. Ink colour is `onSurface`,
 * muted ink is `onSurfaceVariant`. Status-pill tints are derived per [PaperKind]
 * with explicit light/dark hex pairs because the M3 token system doesn't have
 * a "receipt amber" or a clean sales/purchase brand divide out of the box.
 */
enum class PaperKind { SALES, RECEIVE, PURCHASE, PSENT }

data class PaperKindColors(
    val pillContainer: Color,
    val pillContent: Color,
    val accent: Color,
)

@Composable
@ReadOnlyComposable
fun paperColorsFor(kind: PaperKind): PaperKindColors {
    val dark = isSystemInDarkTheme()
    return when (kind) {
        PaperKind.SALES -> if (dark) {
            PaperKindColors(Color(0xFF112B4D), Color(0xFFCBE0FF), Color(0xFF6AA3FF))
        } else {
            PaperKindColors(Color(0xFFE7F1FD), Color(0xFF1856B0), Color(0xFF0A84FF))
        }
        PaperKind.RECEIVE -> if (dark) {
            PaperKindColors(Color(0xFF0E3A23), Color(0xFFB6F0CE), Color(0xFF4AC57E))
        } else {
            PaperKindColors(Color(0xFFE0F5E7), Color(0xFF1F7A3B), Color(0xFF228B45))
        }
        PaperKind.PURCHASE -> if (dark) {
            PaperKindColors(Color(0xFF3D2C12), Color(0xFFF0D4A3), Color(0xFFD9A25C))
        } else {
            PaperKindColors(Color(0xFFFDF1E0), Color(0xFF985200), Color(0xFFB86B00))
        }
        PaperKind.PSENT -> if (dark) {
            PaperKindColors(Color(0xFF3A1614), Color(0xFFF3A8A6), Color(0xFFEF5350))
        } else {
            PaperKindColors(Color(0xFFFDE2DD), Color(0xFFA82D20), Color(0xFFC0392B))
        }
    }
}

/**
 * Outer "paper sheet" container. Wrap one or more sections in this — header,
 * fields, lines/totals — and they'll inherit the card's surface + padding.
 */
@Composable
fun PaperCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        contentColor = MaterialTheme.colorScheme.onSurface,
        shadowElevation = 2.dp,
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 22.dp)) {
            content()
        }
    }
}

/**
 * Brand label + bold doc number + monospace date + status pill — centred,
 * one column. The pill colour is determined by [kind] via [paperColorsFor].
 */
@Composable
fun PaperHeader(
    brandLabel: String,
    docNumber: String,
    dateText: String,
    statusText: String,
    kind: PaperKind,
) {
    val pill = paperColorsFor(kind)
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = brandLabel,
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = docNumber,
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-0.02).em,
            ),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = dateText,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Surface(
            shape = RoundedCornerShape(999.dp),
            color = pill.pillContainer,
            contentColor = pill.pillContent,
        ) {
            Text(
                text = statusText,
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
            )
        }
    }
}

@Composable
fun PaperField(label: String, value: String, valueDimmed: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium,
            color = if (valueDimmed) {
                MaterialTheme.colorScheme.onSurfaceVariant
            } else {
                MaterialTheme.colorScheme.onSurface
            },
            textAlign = TextAlign.End,
        )
    }
}

/**
 * Line item — name + "qty × price" first row, large total second row right.
 * Used by invoice-style papers (sales, purchase).
 */
@Composable
fun PaperLine(
    name: String,
    qtyTimesPrice: String,
    rowTotal: String,
) {
    Column(modifier = Modifier.padding(vertical = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = name,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = qtyTimesPrice,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = rowTotal,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
fun PaperTotalsRow(label: String, value: String, total: Boolean = false, accent: Color? = null) {
    val style = if (total) {
        MaterialTheme.typography.titleMedium.copy(
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 0.04.em,
        )
    } else {
        MaterialTheme.typography.bodyMedium
    }
    val ink = accent ?: MaterialTheme.colorScheme.onSurface
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = if (total) label.uppercase() else label,
            fontFamily = FontFamily.Monospace,
            style = style,
            color = ink,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = value,
            fontFamily = FontFamily.Monospace,
            style = style,
            color = ink,
        )
    }
}

/**
 * Hero amount — used by payment received / sent papers in place of line items.
 * Arrow ↓ for inflow (green), ↑ for outflow (red), tinted via [color].
 */
@Composable
fun PaperBigAmount(
    label: String,
    amount: String,
    currencyCode: String,
    color: Color,
    arrow: String = "",
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            if (arrow.isNotEmpty()) {
                Text(
                    text = arrow,
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = color,
                    modifier = Modifier.padding(end = 6.dp),
                )
            }
            Text(
                text = amount,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.02).em,
                ),
                color = color,
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = currencyCode,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }
    }
}

/** One row inside an "Allocated to" list (payments). */
@Composable
fun PaperAllocRow(
    invoiceNumber: String,
    meta: String?,
    amount: String,
    showTopDivider: Boolean = false,
) {
    if (showTopDivider) {
        DashedDivider(modifier = Modifier.padding(top = 2.dp, bottom = 2.dp), insetDp = 0)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = invoiceNumber,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            if (meta != null) {
                Text(
                    text = meta,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            text = amount,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

/** Small section eyebrow inside the paper, e.g. "ALLOCATED TO". */
@Composable
fun PaperSectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall.copy(
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.sp,
        ),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(vertical = 4.dp),
    )
}

/** Footer thank-you / receipt id line. */
@Composable
fun PaperFooter(text: String) {
    Text(
        text = text,
        fontFamily = FontFamily.Monospace,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp),
    )
}

/** Horizontal dashed rule. `insetDp` lets callers pull the line slightly out of card padding. */
@Composable
fun DashedDivider(modifier: Modifier = Modifier, insetDp: Int = 4) {
    val color = MaterialTheme.colorScheme.outlineVariant
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(1.dp)
            .padding(horizontal = (-insetDp).dp.coerceAtLeast(0.dp)),
    ) {
        val dash = 6.dp.toPx()
        val gap = 4.dp.toPx()
        drawLine(
            color = color,
            start = Offset(0f, size.height / 2f),
            end = Offset(size.width, size.height / 2f),
            strokeWidth = 1.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(dash, gap)),
        )
    }
}

