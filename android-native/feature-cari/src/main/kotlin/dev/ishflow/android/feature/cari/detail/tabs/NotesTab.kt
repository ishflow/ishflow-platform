package dev.ishflow.android.feature.cari.detail.tabs

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.StickyNote2
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.NoteEntry
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.feature.cari.R

/**
 * Notes tab inside Customer 360. Renders a read-only list of notes fetched
 * from the counterparty-360 endpoint, or an empty state when none exist.
 * Notes are created/edited via the web platform only.
 */
@Composable
fun NotesTab(
    notes: List<NoteEntry>,
    modifier: Modifier = Modifier,
) {
    if (notes.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.StickyNote2,
            title = stringResource(R.string.cari_notes_empty_title),
            message = stringResource(R.string.cari_notes_empty_message),
            modifier = modifier.fillMaxSize(),
        )
        return
    }
    LazyColumn(modifier = modifier.fillMaxSize()) {
        items(notes) { note ->
            Card(
                modifier = Modifier
                    .padding(horizontal = 8.dp, vertical = 4.dp)
                    .fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = note.text,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = buildString {
                            val author = note.author
                            if (!author.isNullOrBlank()) {
                                append(author)
                                append(" · ")
                            }
                            append(note.createdAt)
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
