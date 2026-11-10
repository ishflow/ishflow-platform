package dev.ishflow.android.appshared.ui

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.R

/**
 * TopAppBar action that triggers a PDF share. Mirrors the iOS `ShareButton`
 * shipped in PR #63: a Material share icon that flips to a spinner while the
 * download is in flight, then back to the icon once the chooser is launched.
 *
 * Caller wires [onClick] to a ViewModel method that fetches + shares via
 * `PdfShareService`. While [isLoading] is true the button is disabled to keep
 * concurrent shares serial.
 */
@Composable
fun ShareButton(
    isLoading: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    IconButton(
        onClick = onClick,
        enabled = !isLoading,
        modifier = modifier,
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(SPINNER_SIZE),
                strokeWidth = SPINNER_STROKE,
            )
        } else {
            Icon(
                imageVector = Icons.Filled.Share,
                contentDescription = stringResource(R.string.share_pdf),
            )
        }
    }
}

private val SPINNER_SIZE = 20.dp
private val SPINNER_STROKE = 2.dp
