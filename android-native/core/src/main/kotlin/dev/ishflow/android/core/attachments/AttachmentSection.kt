package dev.ishflow.android.core.attachments

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.core.R

/**
 * Shared attachment strip used by all wizard screens.
 *
 * When [readOnly] is false (default), a Scan and Pick-from-library icon pair
 * appears in the card header so the wizard TopAppBar stays clean. Thumbnails
 * are always clickable for preview via [onPreview]; a per-tile close button
 * fires [onDelete] when not in read-only mode.
 *
 * Pure presentation — upload work is owned by the ViewModel; [uploadingCount]
 * drives the trailing spinner so the user sees pending uploads alongside
 * existing thumbnails.
 */
@Composable
fun AttachmentSection(
    attachments: List<AttachmentMeta>,
    uploadingCount: Int,
    onScanClick: () -> Unit,
    onPickFromLibrary: () -> Unit,
    onPreview: (AttachmentMeta) -> Unit,
    onDelete: (AttachmentMeta) -> Unit,
    readOnly: Boolean = false,
    modifier: Modifier = Modifier,
) {
    OutlinedCard(modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header row: title at start, action icons at end
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.core_attachments_section_title),
                    style = MaterialTheme.typography.titleMedium,
                )
                if (!readOnly) {
                    Row {
                        IconButton(onClick = onScanClick) {
                            Icon(
                                imageVector = Icons.Filled.DocumentScanner,
                                contentDescription = stringResource(R.string.core_attachments_scan),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                        IconButton(onClick = onPickFromLibrary) {
                            Icon(
                                imageVector = Icons.Filled.AttachFile,
                                contentDescription = stringResource(R.string.core_attachments_pick),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }

            // Content: empty placeholder or thumbnail row
            if (attachments.isEmpty() && uploadingCount == 0) {
                Text(
                    text = stringResource(R.string.core_attachments_empty),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            } else {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(top = 12.dp),
                ) {
                    items(attachments, key = { it.id }) { meta ->
                        AttachmentTile(
                            meta = meta,
                            readOnly = readOnly,
                            onPreview = { onPreview(meta) },
                            onDelete = { onDelete(meta) },
                        )
                    }
                    if (uploadingCount > 0) {
                        item("uploading") { UploadingTile() }
                    }
                }
            }
        }
    }
}

@Composable
private fun AttachmentTile(
    meta: AttachmentMeta,
    readOnly: Boolean,
    onPreview: () -> Unit,
    onDelete: () -> Unit,
) {
    ElevatedCard(
        modifier = Modifier
            .size(THUMBNAIL_SIZE_DP.dp)
            .clickable { onPreview() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                if (!readOnly) {
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(REMOVE_BUTTON_SIZE_DP.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = stringResource(R.string.core_attachments_remove),
                        )
                    }
                }
            }
            Text(
                text = meta.name,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
            )
        }
    }
}

@Composable
private fun UploadingTile() {
    OutlinedCard(modifier = Modifier.size(THUMBNAIL_SIZE_DP.dp)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator()
        }
    }
}

private const val THUMBNAIL_SIZE_DP = 96
private const val REMOVE_BUTTON_SIZE_DP = 24
