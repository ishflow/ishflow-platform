package dev.ishflow.android.core.attachments

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import dagger.hilt.android.qualifiers.ApplicationContext
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.AttachmentUploadRequest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Uploads attachments via the two-step contract on
 * `POST /api/mobile/attachments/upload`:
 *
 *   1. POST sign request → server creates the DB row + presigned PUT URL.
 *   2. PUT the bytes to the presigned URL.
 *
 * No separate "register" call is needed because the server creates the
 * row inside step 1. The caller (wizard ViewModel) is responsible for
 * supplying a stable `entityId` — typically a client-generated draft
 * UUID; on document create the wire body ships
 * [`PurchaseInvoiceCreate.attachmentDraftId`] so the server rebinds the
 * attachment rows to the real document id.
 *
 * The OkHttpClient is shared with Retrofit so the same auth interceptor
 * is applied to the sign call — and the PUT goes to R2 directly, which
 * doesn't require auth headers.
 */
@Singleton
class AttachmentUploader @Inject constructor(
    private val api: ApiService,
    private val okHttp: OkHttpClient,
    @ApplicationContext private val context: Context,
) {

    /**
     * Reads bytes from [uri], signs an upload slot, PUTs the bytes, and
     * returns the server-issued metadata. Returns a [Result] so callers
     * can render an error toast without try/catch boilerplate.
     *
     * Cancellation propagates: if the coroutine is cancelled mid-upload,
     * the underlying OkHttp call is interrupted and [CancellationException]
     * is rethrown unchanged (never wrapped in `Result.failure`).
     */
    @Suppress("TooGenericExceptionCaught")
    suspend fun upload(
        uri: Uri,
        entity: String,
        entityId: String,
    ): Result<AttachmentMeta> = try {
        Result.success(uploadOrThrow(uri, entity, entityId))
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }

    private suspend fun uploadOrThrow(
        uri: Uri,
        entity: String,
        entityId: String,
    ): AttachmentMeta = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val name = resolver.displayNameOf(uri) ?: defaultFileName(uri)
        val mime = resolver.getType(uri) ?: guessMimeFromName(name) ?: DEFAULT_MIME
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IOException("Cannot open $uri")

        val signed = api.uploadAttachmentSign(
            AttachmentUploadRequest(
                fileName = name,
                mimeType = mime,
                size = bytes.size.toLong(),
                entity = entity,
                entityId = entityId,
            ),
        )

        val putRequest = Request.Builder()
            .url(signed.uploadUrl)
            .put(bytes.toRequestBody(mime.toMediaTypeOrNull()))
            .build()
        okHttp.newCall(putRequest).execute().use { resp ->
            if (!resp.isSuccessful) {
                throw IOException("R2 PUT failed: ${resp.code} ${resp.message}")
            }
        }

        AttachmentMeta(
            id = signed.attachmentId,
            name = name,
            sizeBytes = bytes.size.toLong(),
            mimeType = mime,
            downloadUrl = signed.downloadUrl,
        )
    }

    private fun ContentResolver.displayNameOf(uri: Uri): String? = try {
        query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) cursor.getString(idx) else null
            } else {
                null
            }
        }
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        null
    }

    private fun defaultFileName(uri: Uri): String =
        uri.lastPathSegment?.substringAfterLast('/') ?: "attachment-${System.currentTimeMillis()}"

    private fun guessMimeFromName(name: String): String? {
        val ext = name.substringAfterLast('.', missingDelimiterValue = "")
        if (ext.isBlank()) return null
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.lowercase())
    }

    private companion object {
        const val DEFAULT_MIME = "application/octet-stream"
    }
}
