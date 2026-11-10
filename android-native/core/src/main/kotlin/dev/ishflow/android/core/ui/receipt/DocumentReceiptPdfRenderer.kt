package dev.ishflow.android.core.ui.receipt

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas as AndroidCanvas
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import android.os.LocaleList
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.core.content.FileProvider
import androidx.core.view.doOnNextLayout
import dev.ishflow.android.appshared.models.DocumentRecord
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.ceil

/**
 * Port of iOS `DocumentReceiptPDFRenderer.swift`. Renders a Compose
 * [DocumentReceiptPdfView] to a multi-page A4 PDF in the share cache and
 * launches the share sheet via FileProvider.
 *
 * Strategy mirrors iOS:
 *   1. Inflate [DocumentReceiptPdfView] into a [ComposeView] sized to the
 *      A4 page width (595 pt × SCALE).
 *   2. Wait one layout pass so Compose materialises into pixels.
 *   3. Rasterise the laid-out view to a tall [Bitmap].
 *   4. Slice the bitmap into 595×842 pt pages with
 *      [android.graphics.pdf.PdfDocument].
 *
 * Locale: the host Compose context must reflect the user's selected app
 * language, not the device default. We wrap [activity] in a config-overridden
 * [Context] using the language from [AppCompatDelegate.getApplicationLocales]
 * so `stringResource()` calls inside the PDF Compose tree resolve through the
 * correct values-<lang>/ resources — iOS hit the same issue with
 * `ImageRenderer` and solved it with an explicit bundle lookup.
 */
object DocumentReceiptPdfRenderer {

    /** Raster scale (3×) — matches iOS ImageRenderer's `scale = 3` for print quality. */
    private const val SCALE: Float = 3f

    /** Off-screen size of the floating ComposeView while it lays out. */
    private const val OFFSCREEN_OFFSET: Int = -10_000

    /**
     * Renders the document into a PDF inside `cacheDir/pdf_share/` and
     * returns the file. Caller is responsible for handing the result to
     * [launchShareIntent].
     */
    suspend fun makePdf(
        activity: Activity,
        doc: DocumentRecord,
        kind: PaperKind,
        currencyCode: String,
        tenantName: String? = null,
    ): File {
        val localeContext = activity.withApplicationLocale()
        val bitmap = renderComposableToBitmap(activity, localeContext) {
            DocumentReceiptPdfView(
                doc = doc,
                kind = kind,
                currencyCode = currencyCode,
                tenantName = tenantName,
            )
        }
        try {
            return sliceBitmapToPdf(activity, bitmap, kind, doc)
        } finally {
            bitmap.recycle()
        }
    }

    /**
     * Standard share-sheet launch — FileProvider + `Intent.ACTION_SEND` with
     * `application/pdf` MIME and a recipient-app subject set to [subject].
     */
    fun launchShareIntent(context: Context, file: File, subject: String, chooserTitle: String) {
        val authority = "${context.packageName}.fileprovider"
        val uri = FileProvider.getUriForFile(context, authority, file)
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, subject)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val chooser = Intent.createChooser(sendIntent, chooserTitle).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }

    // ----- internals -----

    private suspend fun renderComposableToBitmap(
        activity: Activity,
        composeContext: Context,
        content: @Composable () -> Unit,
    ): Bitmap = suspendCancellableCoroutine { cont ->
        val pageWidthPx = (PdfPageSpec.PageWidthPt * SCALE).toInt()
        val composeView = ComposeView(composeContext).apply {
            id = View.generateViewId()
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
            setContent { content() }
        }
        val root = activity.findViewById<ViewGroup>(android.R.id.content)
        val params = FrameLayout.LayoutParams(pageWidthPx, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            leftMargin = OFFSCREEN_OFFSET
            topMargin = OFFSCREEN_OFFSET
        }
        // Attach off-screen so Compose runs through a layout/draw pass with
        // the activity's lifecycle owners (LocalLifecycleOwner etc.).
        root.addView(composeView, params)

        composeView.doOnNextLayout {
            try {
                composeView.measure(
                    View.MeasureSpec.makeMeasureSpec(pageWidthPx, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                )
                val height = composeView.measuredHeight.coerceAtLeast(1)
                composeView.layout(0, 0, pageWidthPx, height)
                val bitmap = Bitmap.createBitmap(pageWidthPx, height, Bitmap.Config.ARGB_8888)
                val canvas = AndroidCanvas(bitmap)
                composeView.draw(canvas)
                cont.resume(bitmap)
            } catch (e: Throwable) {
                cont.resumeWithException(e)
            } finally {
                root.removeView(composeView)
            }
        }

        cont.invokeOnCancellation {
            if (composeView.parent != null) {
                (composeView.parent as ViewGroup).removeView(composeView)
            }
        }
    }

    private fun sliceBitmapToPdf(
        context: Context,
        bitmap: Bitmap,
        kind: PaperKind,
        doc: DocumentRecord,
    ): File {
        val pageWidthPx = bitmap.width
        val pageHeightPx = (PdfPageSpec.PageHeightPt * SCALE).toInt()
        val pageCount = maxOf(1, ceil(bitmap.height.toFloat() / pageHeightPx).toInt())

        val pdf = PdfDocument()
        try {
            for (i in 0 until pageCount) {
                val info = PdfDocument.PageInfo.Builder(
                    PdfPageSpec.PageWidthPt.toInt(),
                    PdfPageSpec.PageHeightPt.toInt(),
                    i + 1,
                ).create()
                val page = pdf.startPage(info)
                val srcTop = i * pageHeightPx
                val srcBottom = minOf(srcTop + pageHeightPx, bitmap.height)
                val src = Rect(0, srcTop, pageWidthPx, srcBottom)
                val visiblePtH = (srcBottom - srcTop) / SCALE
                val dst = Rect(
                    0,
                    0,
                    PdfPageSpec.PageWidthPt.toInt(),
                    visiblePtH.toInt(),
                )
                page.canvas.drawBitmap(bitmap, src, dst, null)
                pdf.finishPage(page)
            }
            val dir = File(context.cacheDir, "pdf_share").apply { mkdirs() }
            val file = File(dir, fileName(kind, doc))
            file.outputStream().use { pdf.writeTo(it) }
            return file
        } finally {
            pdf.close()
        }
    }

    private fun fileName(kind: PaperKind, doc: DocumentRecord): String {
        val prefix = when (kind) {
            PaperKind.SALES -> "invoice"
            PaperKind.RECEIVE -> "receipt"
            PaperKind.PURCHASE -> "purchase"
            PaperKind.PSENT -> "payment"
        }
        val safeNumber = doc.number.replace('/', '-').replace(' ', '_')
        return "$prefix-$safeNumber.pdf"
    }

    private fun Context.withApplicationLocale(): Context {
        val locale = currentAppLocale() ?: return this
        val config = Configuration(resources.configuration).apply {
            setLocale(locale)
            setLocales(LocaleList(locale))
        }
        return createConfigurationContext(config)
    }

    /**
     * Pull the user's chosen app locale from AppCompat's per-app locale store.
     * Returns null when the user has never picked one (then we let the system
     * default flow through, which is the safest fallback for currency / date
     * formatting in the PDF body).
     */
    private fun currentAppLocale(): Locale? {
        val list = AppCompatDelegate.getApplicationLocales()
        return if (list.isEmpty) null else list[0]
    }
}

