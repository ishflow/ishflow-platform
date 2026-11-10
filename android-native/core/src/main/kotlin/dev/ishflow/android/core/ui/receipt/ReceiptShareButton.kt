package dev.ishflow.android.core.ui.receipt

import android.app.Activity
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.IosShare
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import dev.ishflow.android.appshared.models.DocumentRecord
import kotlinx.coroutines.launch

/**
 * Top-app-bar share action for a POSTED document detail. Wraps
 * [DocumentReceiptPdfRenderer]: tap → renders the document into a B&W A4
 * PDF in the cache → opens the share sheet.
 *
 * Renders a small progress spinner while the renderer is running so the
 * user gets feedback during the layout/raster pass. On failure surfaces a
 * snackbar via the caller-supplied [snackbarHostState].
 */
@Composable
fun ReceiptShareButton(
    activity: Activity,
    document: DocumentRecord,
    kind: PaperKind,
    currencyCode: String,
    failureMessage: String,
    snackbarHostState: SnackbarHostState,
    tenantName: String? = null,
    chooserTitle: String = "Share PDF",
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(false) }
    var pendingError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(pendingError) {
        val err = pendingError ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(err)
        pendingError = null
    }

    IconButton(
        onClick = {
            if (loading) return@IconButton
            loading = true
            scope.launch {
                runCatching {
                    val file = DocumentReceiptPdfRenderer.makePdf(
                        activity = activity,
                        doc = document,
                        kind = kind,
                        currencyCode = currencyCode,
                        tenantName = tenantName,
                    )
                    DocumentReceiptPdfRenderer.launchShareIntent(
                        context = context,
                        file = file,
                        subject = document.number,
                        chooserTitle = chooserTitle,
                    )
                }.onFailure { pendingError = failureMessage }
                loading = false
            }
        },
        enabled = !loading,
    ) {
        if (loading) {
            CircularProgressIndicator(
                strokeWidth = 2.dp,
                modifier = Modifier,
            )
        } else {
            Icon(imageVector = Icons.Filled.IosShare, contentDescription = chooserTitle)
        }
    }
}
