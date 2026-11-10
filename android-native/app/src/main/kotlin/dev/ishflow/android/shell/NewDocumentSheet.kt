package dev.ishflow.android.shell

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import dev.ishflow.android.R

/**
 * Actions emitted by [NewDocumentSheet] when the user taps a row.
 *
 * The caller (typically [dev.ishflow.android.MainScaffold]) navigates to the
 * matching wizard. We keep a sealed type so the wire-up is exhaustive — a new
 * doc kind forces a compile error in the dispatch `when`.
 */
sealed interface NewDocumentAction {
    data object SalesInvoice : NewDocumentAction
    data object PaymentReceived : NewDocumentAction
    data object PurchaseInvoice : NewDocumentAction
    data object PaymentSent : NewDocumentAction
}

/**
 * "+" sheet opened by the bottom-bar `+` tab in [dev.ishflow.android.MainScaffold].
 * Two logical sections: Sales (invoice, receipt) and Purchases (invoice, payment).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewDocumentSheet(
    sheetState: SheetState,
    onAction: (NewDocumentAction) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        NewDocumentRow(
            icon = Icons.AutoMirrored.Filled.ReceiptLong,
            label = stringResource(R.string.new_doc_sales_invoice),
            onClick = { onAction(NewDocumentAction.SalesInvoice) },
        )
        NewDocumentRow(
            icon = Icons.AutoMirrored.Filled.TrendingUp,
            label = stringResource(R.string.new_doc_payment_received),
            onClick = { onAction(NewDocumentAction.PaymentReceived) },
        )
        NewDocumentRow(
            icon = Icons.Filled.LocalShipping,
            label = stringResource(R.string.new_doc_purchase_invoice),
            onClick = { onAction(NewDocumentAction.PurchaseInvoice) },
        )
        NewDocumentRow(
            icon = Icons.AutoMirrored.Filled.TrendingDown,
            label = stringResource(R.string.new_doc_payment_sent),
            onClick = { onAction(NewDocumentAction.PaymentSent) },
        )
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun NewDocumentRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(label) },
        leadingContent = { Icon(icon, contentDescription = null) },
        modifier = Modifier.clickableRow(onClick),
    )
}
