package dev.ishflow.android.core.pdf

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import dagger.hilt.android.qualifiers.ApplicationContext
import dev.ishflow.android.apiclient.ApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Fetches a server-rendered PDF for a posted document and hands it to the
 * Android share sheet via `FileProvider` + `Intent.ACTION_SEND`. Mirrors the
 * iOS `PDFShareService` shipped in PR #63.
 *
 * The streamed response body is written to the app cache (`pdf_share/`) and
 * shared via the manifest-declared `${applicationId}.fileprovider` authority.
 * The single-file cache means consecutive shares of the same document reuse
 * the same path; we still rewrite on each call to keep contents fresh.
 */
@Singleton
class PdfShareService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService,
) {

    /**
     * Downloads the PDF and launches a share chooser.
     *
     * @param docType server document type (e.g. `sales.invoice`).
     * @param docId document UUID.
     * @param documentNumber human-friendly subject for the chooser (e.g. `SF-0042`).
     * @param chooserTitle title shown in the chooser sheet.
     * @return [Result.success] on chooser launch; [Result.failure] on network /
     *   filesystem / activity errors. 501 from server (other doc types) bubbles
     *   up as failure and callers should fall back to hiding the share button.
     */
    @Suppress("TooGenericExceptionCaught")
    suspend fun fetchAndShare(
        docType: String,
        docId: String,
        documentNumber: String,
        chooserTitle: String,
    ): Result<Unit> = runCatching {
        val file = downloadToCache(docType, docId)
        launchShareIntent(file, documentNumber, chooserTitle)
    }

    private suspend fun downloadToCache(docType: String, docId: String): File =
        withContext(Dispatchers.IO) {
            val body = api.getDocumentPdf(docType, docId)
            body.use { source ->
                val dir = File(context.cacheDir, CACHE_DIR_NAME).apply { mkdirs() }
                val target = File(dir, fileNameFor(docType, docId))
                source.byteStream().use { input ->
                    target.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                target
            }
        }

    private fun launchShareIntent(file: File, documentNumber: String, chooserTitle: String) {
        val authority = "${context.packageName}.fileprovider"
        val uri = FileProvider.getUriForFile(context, authority, file)
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = PDF_MIME
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, documentNumber)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val chooser = Intent.createChooser(sendIntent, chooserTitle).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }

    private fun fileNameFor(docType: String, docId: String): String {
        val safeType = docType.replace('.', '_')
        return "$safeType-$docId.pdf"
    }

    companion object {
        private const val CACHE_DIR_NAME = "pdf_share"
        private const val PDF_MIME = "application/pdf"
    }
}
