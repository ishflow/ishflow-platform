package dev.ishflow.android.appshared.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.R
import dev.ishflow.android.appshared.models.AttachmentRecord

private val SECTION_PADDING = 16.dp

/**
 * Shared read-only attachments card rendered on all POSTED document detail surfaces.
 *
 * Lists attachments; tapping one opens its [AttachmentRecord.signedUrl] via [Intent.ACTION_VIEW].
 * The delete icon triggers an [AlertDialog] confirmation before calling [onDeleteAttachment].
 *
 * Upload (adding new attachments) is intentionally NOT part of this card — that is handled
 * by the per-wizard attachment flow.
 */
@Composable
fun AttachmentsCard(
    attachments: List<AttachmentRecord>,
    onDeleteAttachment: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var pendingDeleteId by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    Card(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(top = SECTION_PADDING, bottom = 8.dp)) {
            Text(
                text = stringResource(R.string.attachments_title),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = SECTION_PADDING),
            )
            attachments.forEach { attachment ->
                ListItem(
                    headlineContent = { Text(attachment.fileName) },
                    supportingContent = { Text(formatBytes(attachment.sizeBytes)) },
                    leadingContent = {
                        Icon(
                            imageVector = Icons.Filled.AttachFile,
                            contentDescription = null,
                        )
                    },
                    trailingContent = {
                        IconButton(onClick = { pendingDeleteId = attachment.id }) {
                            Icon(
                                imageVector = Icons.Filled.Delete,
                                contentDescription = stringResource(R.string.attachment_delete_title),
                            )
                        }
                    },
                    modifier = Modifier.clickable(
                        enabled = attachment.signedUrl != null,
                        onClick = {
                            attachment.signedUrl?.let { url ->
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                context.startActivity(intent)
                            }
                        },
                    ),
                )
            }
        }
    }

    if (pendingDeleteId != null) {
        AlertDialog(
            onDismissRequest = { pendingDeleteId = null },
            title = { Text(stringResource(R.string.attachment_delete_title)) },
            text = { Text(stringResource(R.string.attachment_delete_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        pendingDeleteId?.let { onDeleteAttachment(it) }
                        pendingDeleteId = null
                    },
                ) {
                    Text(stringResource(R.string.attachment_delete_title))
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteId = null }) {
                    Text(stringResource(R.string.action_close))
                }
            },
        )
    }
}

/** Returns a human-readable file size string, e.g. "12 KB", "3.4 MB". */
fun formatBytes(bytes: Long): String {
    return when {
        bytes < 1024L -> "$bytes B"
        bytes < 1024L * 1024L -> "${bytes / 1024L} KB"
        bytes < 1024L * 1024L * 1024L -> {
            val mb = bytes.toDouble() / (1024.0 * 1024.0)
            "%.1f MB".format(mb)
        }
        else -> {
            val gb = bytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
            "%.1f GB".format(gb)
        }
    }
}
