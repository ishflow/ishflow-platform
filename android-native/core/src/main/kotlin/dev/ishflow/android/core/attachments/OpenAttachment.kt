package dev.ishflow.android.core.attachments

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Opens the attachment in the system viewer via the signed downloadUrl.
 * R2 returns a `Content-Disposition: attachment` header, so the browser/intent
 * handler will download to a local file. For inline preview, R2 needs to set
 * inline content-disposition — out of scope for v1.
 */
fun openAttachment(context: Context, meta: AttachmentMeta) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(meta.downloadUrl)).apply {
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
    } else {
        context.startActivity(Intent.createChooser(intent, "Open"))
    }
}
