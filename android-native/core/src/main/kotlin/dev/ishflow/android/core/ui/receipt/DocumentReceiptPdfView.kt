package dev.ishflow.android.core.ui.receipt

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/**
 * Black-and-white A4 paper-receipt rendering of a [DocumentRecord], designed
 * to be rasterised via [DocumentReceiptPdfRenderer] into a multi-page PDF.
 *
 * Mirrors the on-screen [DocumentDetailContent] layout but strips every hue:
 * monospace body, plain border on the status pill, neutral totals. Direction
 * (in / out / due) is communicated by labels + arrow glyphs + sign prefixes
 * — never colour — so the print is legible on a black-and-white printer.
 *
 * Sized for the A4 content area ([PdfPageSpec.contentWidth] points). The
 * Composable lays out at its natural height; the renderer slices it into
 * 595×842 pt pages.
 */
@Composable
fun DocumentReceiptPdfView(
    doc: DocumentRecord,
    kind: PaperKind,
    currencyCode: String,
    tenantName: String? = null,
) {
    val widthDp = with(LocalDensity.current) { PdfPageSpec.ContentWidthPt.toDp() }
    Column(
        modifier = Modifier
            .width(widthDp)
            .background(Color.White)
            .padding(vertical = 12.dp),
        verticalArrangement = Arrangement.Top,
    ) {
        PdfHeader(doc = doc, kind = kind, tenantName = tenantName)
        BwDashedRule()
        PdfMetaFields(doc = doc, kind = kind)
        BwDashedRule()
        PdfContent(doc = doc, kind = kind, currencyCode = currencyCode)
        BwDashedRule()
        PdfTotals(doc = doc, kind = kind)
        Spacer(modifier = Modifier.height(16.dp))
        PdfFooter(doc = doc, kind = kind)
    }
}

@Composable
private fun PdfHeader(doc: DocumentRecord, kind: PaperKind, tenantName: String?) {
    val brand = remember(tenantName) {
        (tenantName?.uppercase(Locale.ROOT) ?: "ISHFLOW")
            .toCharArray().joinToString(" ")
    }
    Column(
        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = brand,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 5.sp,
            ),
            color = Color.Black.copy(alpha = 0.65f),
            modifier = Modifier.padding(bottom = 4.dp),
        )
        Text(
            text = doc.number,
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
            ),
            color = Color.Black,
        )
        Text(
            text = stringResource(kindTitleRes(kind)).uppercase(Locale.ROOT),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 2.sp,
            ),
            color = Color.Black.copy(alpha = 0.55f),
        )
        Text(
            text = remember(doc.date) { pdfDateFormatter.format(doc.date) },
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
            color = Color.Black.copy(alpha = 0.65f),
            modifier = Modifier.padding(bottom = 8.dp),
        )
        OutlinedStatusPill(status = doc.status, kind = kind)
    }
}

@Composable
private fun OutlinedStatusPill(status: DocumentStatus, kind: PaperKind) {
    val labelRes = if (status != DocumentStatus.POSTED) {
        when (status) {
            DocumentStatus.DRAFT -> R.string.status_draft
            DocumentStatus.SAVED -> R.string.status_saved
            DocumentStatus.CANCELLED -> R.string.status_cancelled
            DocumentStatus.POSTED -> R.string.status_posted
        }
    } else {
        when (kind) {
            PaperKind.RECEIVE -> R.string.docs_detail_pill_received
            PaperKind.PSENT -> R.string.docs_detail_pill_sent
            else -> R.string.status_posted
        }
    }
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = Color.Transparent,
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.Black),
    ) {
        Text(
            text = stringResource(labelRes).uppercase(Locale.ROOT),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
            ),
            color = Color.Black,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun PdfMetaFields(doc: DocumentRecord, kind: PaperKind) {
    Column {
        doc.customer?.let { PdfFieldRow(R.string.docs_detail_customer, it.name) }
        doc.supplier?.let { PdfFieldRow(R.string.docs_detail_supplier, it.name) }
        val hasLines = !doc.items.isNullOrEmpty()
        if (hasLines) PdfFieldRow(R.string.docs_detail_warehouse, doc.warehouse?.name)
        if (kind == PaperKind.SALES) PdfFieldRow(R.string.docs_detail_priceType, doc.priceType?.name)
    }
}

@Composable
private fun PdfFieldRow(labelRes: Int, value: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(labelRes),
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
            color = Color.Black,
            modifier = Modifier.weight(1f),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = if (value.isNullOrEmpty()) "—" else value,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
            color = if (value.isNullOrEmpty()) Color.Black.copy(alpha = 0.35f) else Color.Black,
            textAlign = TextAlign.End,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun PdfContent(doc: DocumentRecord, kind: PaperKind, currencyCode: String) {
    val lines = doc.items
    if (!lines.isNullOrEmpty()) {
        Column {
            lines.forEach { line ->
                PdfLineRow(
                    productName = line.product?.name ?: line.productName ?: "—",
                    qtyTimesPrice = "${line.quantity} × ${line.price}",
                    rowTotal = line.total,
                )
            }
        }
    } else {
        PdfBigAmount(amount = doc.total ?: "—", currencyCode = currencyCode, kind = kind)
    }
}

@Composable
private fun PdfLineRow(productName: String, qtyTimesPrice: String, rowTotal: String) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = productName,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 12.5f.sp,
                    fontWeight = FontWeight.Medium,
                ),
                color = Color.Black,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = qtyTimesPrice,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.5f.sp),
                color = Color.Black.copy(alpha = 0.65f),
            )
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = rowTotal,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 12.5f.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = Color.Black,
            )
        }
    }
}

@Composable
private fun PdfBigAmount(amount: String, currencyCode: String, kind: PaperKind) {
    val (labelRes, arrow) = when (kind) {
        PaperKind.RECEIVE -> R.string.docs_detail_amount_received to "↓"
        PaperKind.PSENT -> R.string.docs_detail_amount_sent to "↑"
        else -> R.string.docs_detail_amount to null
    }
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(labelRes).uppercase(Locale.ROOT),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
            ),
            color = Color.Black.copy(alpha = 0.65f),
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Row(verticalAlignment = Alignment.Bottom) {
            arrow?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontSize = 26.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = Color.Black,
                    modifier = Modifier.padding(end = 4.dp),
                )
            }
            Text(
                text = amount,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.displaySmall.copy(
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = Color.Black,
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = currencyCode,
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Black.copy(alpha = 0.55f),
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }
    }
}

@Composable
private fun PdfTotals(doc: DocumentRecord, kind: PaperKind) {
    val (labelRes, prefix) = when (kind) {
        PaperKind.SALES -> R.string.docs_detail_total to null
        PaperKind.RECEIVE -> R.string.docs_detail_total_in to "+ "
        PaperKind.PURCHASE -> R.string.docs_detail_total_due to null
        PaperKind.PSENT -> R.string.docs_detail_total_out to "− "
    }
    val total = doc.total ?: "—"
    val hasLines = !doc.items.isNullOrEmpty()
    Column {
        if (hasLines) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.docs_detail_subtotal),
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                    color = Color.Black,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = total,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                    color = Color.Black,
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
                text = stringResource(labelRes).uppercase(Locale.ROOT),
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.8.sp,
                ),
                color = Color.Black,
                modifier = Modifier.weight(1f),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                prefix?.let {
                    Text(
                        text = it,
                        fontFamily = FontFamily.Monospace,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                        ),
                        color = Color.Black,
                    )
                }
                Text(
                    text = total,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                    ),
                    color = Color.Black,
                )
            }
        }
    }
}

@Composable
private fun PdfFooter(doc: DocumentRecord, kind: PaperKind) {
    val prefixRes = when (kind) {
        PaperKind.SALES -> R.string.docs_detail_footer_sales
        PaperKind.RECEIVE -> R.string.docs_detail_footer_received
        PaperKind.PURCHASE -> R.string.docs_detail_footer_purchase
        PaperKind.PSENT -> R.string.docs_detail_footer_sent
    }
    val shortId = remember(doc.id) { doc.id.replace("-", "").take(8).uppercase(Locale.ROOT) }
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "${stringResource(prefixRes)} · #$shortId",
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.5f.sp),
            color = Color.Black.copy(alpha = 0.55f),
        )
        Text(
            text = "ID: ${doc.id}",
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 8.5f.sp),
            color = Color.Black.copy(alpha = 0.35f),
        )
    }
}

/**
 * Thinner dashed rule for the B&W PDF (0.6 dp, 3-3 dash) — matches the iOS
 * `dashedRule` on `DocumentReceiptPDFView`.
 */
@Composable
private fun BwDashedRule() {
    val color = Color.Black.copy(alpha = 0.40f)
    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        androidx.compose.foundation.Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp),
        ) {
            val dash = 3.dp.toPx()
            val gap = 3.dp.toPx()
            drawLine(
                color = color,
                start = androidx.compose.ui.geometry.Offset(0f, size.height / 2f),
                end = androidx.compose.ui.geometry.Offset(size.width, size.height / 2f),
                strokeWidth = 0.6.dp.toPx(),
                pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(
                    floatArrayOf(dash, gap),
                ),
            )
        }
    }
}

private fun kindTitleRes(kind: PaperKind): Int = when (kind) {
    PaperKind.SALES -> R.string.docs_detail_kind_sales_invoice
    PaperKind.RECEIVE -> R.string.docs_detail_kind_payment_received
    PaperKind.PURCHASE -> R.string.docs_detail_kind_purchase_invoice
    PaperKind.PSENT -> R.string.docs_detail_kind_payment_sent
}

private val pdfDateFormatter: DateTimeFormatter =
    DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withZone(ZoneId.systemDefault())

/** A4 PDF page sizing in points (1pt = 1/72 inch). */
object PdfPageSpec {
    const val PageWidthPt: Float = 595f
    const val PageHeightPt: Float = 842f
    const val PageMarginPt: Float = 36f
    const val ContentWidthPt: Float = PageWidthPt - 2 * PageMarginPt
}
