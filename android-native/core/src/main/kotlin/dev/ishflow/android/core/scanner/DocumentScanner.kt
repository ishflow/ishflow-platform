package dev.ishflow.android.core.scanner

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.IntentSender
import android.net.Uri
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Thin wrapper around ML Kit's GmsDocumentScanning API.
 *
 * The scanner ships as a Google Play Services module — no AppCompat
 * pulled in transitively. We hand the [IntentSender] back to the
 * caller so the Composable can use
 * [androidx.activity.compose.rememberLauncherForActivityResult] with
 * [androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult],
 * keeping the suspend/Activity-binding split clean.
 *
 * Defaults: gallery import OFF, page limit 5, FULL mode, JPEG output.
 * Tweak via [scannerOptions] if a future call site needs PDF output.
 */
@Singleton
class DocumentScanner @Inject constructor() {

    /**
     * Builds the scanner intent. Suspends until ML Kit hands us an
     * [IntentSender]; under the hood this is a single Task<IntentSender>
     * round-trip with the GMS module manifest (no network calls).
     */
    suspend fun buildIntentSender(
        activity: Activity,
        pageLimit: Int = DEFAULT_PAGE_LIMIT,
    ): IntentSender = suspendCancellableCoroutine { cont ->
        val client = GmsDocumentScanning.getClient(scannerOptions(pageLimit))
        client.getStartScanIntent(activity)
            .addOnSuccessListener { sender -> cont.resume(sender) }
            .addOnCanceledListener { cont.resumeWithException(CancellationException("Scanner canceled")) }
            .addOnFailureListener { cont.resumeWithException(it) }
    }

    /**
     * Parses the activity-result intent ML Kit returns after a successful
     * scan. Returns the JPEG page URIs in capture order, or an empty list
     * when the user backed out without confirming.
     */
    fun parseResult(data: Intent?): List<Uri> {
        if (data == null) return emptyList()
        val result = GmsDocumentScanningResult.fromActivityResultIntent(data) ?: return emptyList()
        return result.pages?.map { it.imageUri } ?: emptyList()
    }

    /**
     * `true` when the caller-side activity-result code says the user
     * confirmed at least one page. Exposed so the Composable can ignore
     * back-press cancels.
     */
    fun isSuccessful(resultCode: Int): Boolean = resultCode == Activity.RESULT_OK

    @Suppress("unused")
    fun preload(@Suppress("UNUSED_PARAMETER") context: Context) {
        // Placeholder: GMS module loads lazily; calling getClient here would
        // warm the cache. Kept as a no-op to avoid eager Play-Services init
        // on screens that never reach the wizard.
    }

    private fun scannerOptions(pageLimit: Int): GmsDocumentScannerOptions =
        GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(false)
            .setPageLimit(pageLimit)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build()

    private companion object {
        const val DEFAULT_PAGE_LIMIT = 5
    }
}
