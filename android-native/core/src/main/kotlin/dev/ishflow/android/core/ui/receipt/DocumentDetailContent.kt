package dev.ishflow.android.core.ui.receipt

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/**
 * Port of iOS `DocumentDetailContent.swift` — a single reusable paper-receipt
 * Composable shared by every POSTED document detail surface (sales invoice,
 * payment received, purchase invoice, payment sent).
 *
 * Both `SalesInvoiceReceiptScreen`, `PurchaseDetailScreen` (POSTED branch)
 * and `GenericDocDetailScreen` (payment POSTED branch) render through this
 * so the visual language stays in lockstep across all four doc kinds.
 *
 * Pure presentation: loading + error handling lives in the calling screens.
 *
 * The on-screen variant is colour-tinted per [PaperKind]; for the printer-
 * friendly B&W A4 mirror used in shared PDFs see [DocumentReceiptPdfView].
 */
/**
 * Renders the paper card itself — **not** a scroll container. Callers that
 * want vertical scrolling must wrap this in `Column(...).verticalScroll(...)`
 * or `LazyColumn { item { … } }` themselves; nesting another vertical-scroll
 * around an inner one is a Compose runtime error.
 *
 * Use [DocumentDetailScroll] when the screen has nothing else below the
 * paper card and just needs a single scrolling viewport.
 */
@Composable
fun DocumentDetailContent(
    doc: DocumentRecord,
    kind: PaperKind,
    currencyCode: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .padding(horizontal = 16.dp)
            .padding(top = 12.dp, bottom = 32.dp),
    ) {
        PaperCardSheet {
            DocumentHeader(doc = doc, kind = kind)
            DashedDivider(modifier = Modifier.padding(vertical = 12.dp))
            DocumentMetaFields(doc = doc, kind = kind)
            DashedDivider(modifier = Modifier.padding(vertical = 12.dp))
            DocumentContent(doc = doc, kind = kind, currencyCode = currencyCode)
            DashedDivider(modifier = Modifier.padding(vertical = 12.dp))
            DocumentTotalsView(doc = doc, kind = kind)
            // Comment isn't on the wire for Android yet — skipping (iOS also
            // hides the block when comment is null/empty).
            DocumentFooter(doc = doc, kind = kind)
        }
    }
}

/**
 * Convenience: paper card inside a single vertical scroll. Use when the
 * screen body is JUST the paper card (no attachments, no draft CTA below).
 */
@Composable
fun DocumentDetailScroll(
    doc: DocumentRecord,
    kind: PaperKind,
    currencyCode: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.verticalScroll(rememberScrollState()),
    ) {
        DocumentDetailContent(doc = doc, kind = kind, currencyCode = currencyCode)
    }
}

/**
 * Outer paper sheet — secondarySystemGroupedBackground on iOS,
 * surfaceContainerLowest here so dark mode renders as a slightly raised
 * card on the darker page.
 */
@Composable
internal fun PaperCardSheet(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        contentColor = MaterialTheme.colorScheme.onSurface,
        shadowElevation = 2.dp,
    ) {
        Column(
            modifier = Modifier
                .border(
                    width = 0.5.dp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.06f),
                    shape = RoundedCornerShape(16.dp),
                )
                .padding(horizontal = 20.dp)
                .padding(top = 22.dp, bottom = 18.dp),
        ) {
            content()
        }
    }
}

@Composable
private fun DocumentHeader(doc: DocumentRecord, kind: PaperKind) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "I S H F L O W",
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 4.sp,
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Text(
            text = doc.number,
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
            ),
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = remember(doc.date) { detailDateFormatter.format(doc.date) },
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        TintedStatusPill(doc = doc, kind = kind)
    }
}

@Composable
private fun TintedStatusPill(doc: DocumentRecord, kind: PaperKind) {
    val style = pillStyle(doc.status, kind)
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = style.background,
        contentColor = style.foreground,
    ) {
        Text(
            text = stringResource(style.labelRes),
            style = MaterialTheme.typography.labelMedium.copy(
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            ),
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
        )
    }
}

@Composable
private fun DocumentMetaFields(doc: DocumentRecord, kind: PaperKind) {
    Column {
        doc.customer?.let {
            PaperFieldRow(
                label = stringResource(R.string.docs_detail_customer),
                value = it.name,
            )
        }
        doc.supplier?.let {
            PaperFieldRow(
                label = stringResource(R.string.docs_detail_supplier),
                value = it.name,
            )
        }
        // Warehouse + price type are resolved {id, name} refs the detail
        // endpoint embeds in the header. Render the name (em-dash when absent),
        // matching iOS + web.
        val hasLines = !doc.items.isNullOrEmpty()
        if (hasLines) {
            PaperFieldRow(
                label = stringResource(R.string.docs_detail_warehouse),
                value = doc.warehouse?.name,
            )
        }
        if (kind == PaperKind.SALES) {
            PaperFieldRow(
                label = stringResource(R.string.docs_detail_priceType),
                value = doc.priceType?.name,
            )
        }
    }
}

@Composable
private fun PaperFieldRow(label: String, value: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        Spacer(modifier = Modifier.width(8.dp))
        val isEmpty = value.isNullOrEmpty()
        Text(
            text = if (isEmpty) "—" else value!!,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
            color = if (isEmpty) {
                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)
            } else {
                MaterialTheme.colorScheme.onSurface
            },
            textAlign = TextAlign.End,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun DocumentContent(doc: DocumentRecord, kind: PaperKind, currencyCode: String) {
    val lines = doc.items
    if (!lines.isNullOrEmpty()) {
        Column {
            lines.forEach { line ->
                PaperLineRow(
                    productName = line.product?.name ?: line.productName ?: "—",
                    qtyTimesPrice = "${line.quantity} × ${line.price}",
                    rowTotal = line.total,
                )
            }
        }
    } else {
        BigAmountBlock(amount = doc.total ?: "—", currencyCode = currencyCode, kind = kind)
    }
}

@Composable
private fun PaperLineRow(productName: String, qtyTimesPrice: String, rowTotal: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = productName,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                ),
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = qtyTimesPrice,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = rowTotal,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun BigAmountBlock(amount: String, currencyCode: String, kind: PaperKind) {
    val style = bigAmountStyle(kind)
    val tint = style.tint ?: MaterialTheme.colorScheme.onSurface
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(style.labelRes).uppercase(Locale.ROOT),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        Row(verticalAlignment = Alignment.Bottom) {
            style.arrow?.let { arrow ->
                Text(
                    text = arrow,
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontSize = 26.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = tint,
                    modifier = Modifier.padding(end = 4.dp),
                )
            }
            Text(
                text = amount,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.displaySmall.copy(
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = tint,
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

@Composable
private fun DocumentTotalsView(doc: DocumentRecord, kind: PaperKind) {
    val totalStyle = totalStyle(kind)
    val tint = totalStyle.tint ?: MaterialTheme.colorScheme.onSurface
    val total = doc.total ?: "—"
    val hasLines = !doc.items.isNullOrEmpty()
    Column {
        if (hasLines) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.docs_detail_subtotal),
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = total,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(totalStyle.labelRes).uppercase(Locale.ROOT),
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.04.em,
                ),
                color = tint,
                modifier = Modifier.weight(1f),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                totalStyle.prefix?.let { prefix ->
                    Text(
                        text = prefix,
                        fontFamily = FontFamily.Monospace,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                        ),
                        color = tint,
                    )
                }
                Text(
                    text = total,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                    ),
                    color = tint,
                )
            }
        }
    }
}

@Composable
private fun DocumentFooter(doc: DocumentRecord, kind: PaperKind) {
    val prefixRes = when (kind) {
        PaperKind.SALES -> R.string.docs_detail_footer_sales
        PaperKind.RECEIVE -> R.string.docs_detail_footer_received
        PaperKind.PURCHASE -> R.string.docs_detail_footer_purchase
        PaperKind.PSENT -> R.string.docs_detail_footer_sent
    }
    val shortId = remember(doc.id) {
        doc.id.replace("-", "").take(6).uppercase(Locale.ROOT)
    }
    Text(
        text = "${stringResource(prefixRes)} · #$shortId",
        fontFamily = FontFamily.Monospace,
        style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp),
    )
}

// ----- Style helpers -----

private data class PillStyle(val labelRes: Int, val foreground: Color, val background: Color)

private data class TotalStyle(val labelRes: Int, val tint: Color?, val prefix: String?)

private data class BigAmountStyleSpec(val labelRes: Int, val tint: Color?, val arrow: String?)

@Composable
@ReadOnlyComposable
private fun pillStyle(status: DocumentStatus, kind: PaperKind): PillStyle {
    if (status != DocumentStatus.POSTED) {
        val (labelRes, tint) = when (status) {
            DocumentStatus.DRAFT -> R.string.status_draft to Color(0xFF8E8E93)
            DocumentStatus.SAVED -> R.string.status_saved to Color(0xFF0A84FF)
            DocumentStatus.CANCELLED -> R.string.status_cancelled to Color(0xFFFF453A)
            DocumentStatus.POSTED -> R.string.status_posted to Color(0xFF34C759)
        }
        return PillStyle(labelRes, tint, tint.copy(alpha = 0.15f))
    }
    val colors = paperColorsFor(kind)
    val labelRes = when (kind) {
        PaperKind.RECEIVE -> R.string.docs_detail_pill_received
        PaperKind.PSENT -> R.string.docs_detail_pill_sent
        else -> R.string.status_posted
    }
    return PillStyle(labelRes, colors.pillContent, colors.pillContainer)
}

@Composable
@ReadOnlyComposable
private fun totalStyle(kind: PaperKind): TotalStyle = when (kind) {
    PaperKind.SALES -> TotalStyle(R.string.docs_detail_total, null, null)
    PaperKind.RECEIVE -> TotalStyle(
        R.string.docs_detail_total_in,
        paperColorsFor(PaperKind.RECEIVE).accent,
        "+ ",
    )
    PaperKind.PURCHASE -> TotalStyle(
        R.string.docs_detail_total_due,
        paperColorsFor(PaperKind.PURCHASE).accent,
        null,
    )
    PaperKind.PSENT -> TotalStyle(
        R.string.docs_detail_total_out,
        paperColorsFor(PaperKind.PSENT).accent,
        "− ",
    )
}

@Composable
@ReadOnlyComposable
private fun bigAmountStyle(kind: PaperKind): BigAmountStyleSpec = when (kind) {
    PaperKind.RECEIVE -> BigAmountStyleSpec(
        R.string.docs_detail_amount_received,
        paperColorsFor(PaperKind.RECEIVE).accent,
        "↓",
    )
    PaperKind.PSENT -> BigAmountStyleSpec(
        R.string.docs_detail_amount_sent,
        paperColorsFor(PaperKind.PSENT).accent,
        "↑",
    )
    else -> BigAmountStyleSpec(R.string.docs_detail_amount, null, null)
}

private val detailDateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withZone(ZoneId.systemDefault())
