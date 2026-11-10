package dev.ishflow.android.feature.sales.wizard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.money.formatMoney
import dev.ishflow.android.feature.sales.R
import java.math.BigDecimal

sealed interface ProductLineDialogMode {
    val productName: String
    val productCode: String?
    val initialQuantity: BigDecimal
    val initialPrice: BigDecimal

    data class Add(
        override val productName: String,
        override val productCode: String?,
        override val initialQuantity: BigDecimal = BigDecimal.ONE,
        override val initialPrice: BigDecimal,
    ) : ProductLineDialogMode

    data class Edit(
        val lineId: String,
        override val productName: String,
        override val productCode: String?,
        override val initialQuantity: BigDecimal,
        override val initialPrice: BigDecimal,
    ) : ProductLineDialogMode
}

private fun parseDecimal(s: String): BigDecimal? =
    runCatching { BigDecimal(s.trim().replace(',', '.')) }.getOrNull()

@Composable
fun InlineProductLineDialog(
    mode: ProductLineDialogMode,
    stockText: String?,
    onDismiss: () -> Unit,
    onSave: (qty: BigDecimal, price: BigDecimal) -> Unit,
) {
    var qtyText by rememberSaveable(mode) {
        mutableStateOf(mode.initialQuantity.toPlainString().replace('.', ','))
    }
    var priceText by rememberSaveable(mode) {
        mutableStateOf(mode.initialPrice.toPlainString().replace('.', ','))
    }

    val qty = parseDecimal(qtyText) ?: BigDecimal.ZERO
    val price = parseDecimal(priceText) ?: BigDecimal.ZERO
    val total = qty.multiply(price)
    val currency = LocalTenantCurrency.current
    val saveEnabled = qty > BigDecimal.ZERO && price >= BigDecimal.ZERO

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLowest,
            tonalElevation = 0.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header row
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = stringResource(
                            if (mode is ProductLineDialogMode.Add) {
                                R.string.wizard_dialog_add_title
                            } else {
                                R.string.wizard_dialog_edit_title
                            },
                        ),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Filled.Close,
                            contentDescription = stringResource(R.string.wizard_dialog_cancel),
                        )
                    }
                }

                // Product summary card — single-line name, optional stock
                // hint. Product code (e.g. "E01F6505") and the price-type
                // chip are intentionally omitted: this dialog is for entering
                // qty + price, not browsing the catalog row.
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(36.dp),
                        ) {
                            Box(
                                modifier = Modifier.fillMaxWidth(),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Inventory2,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = mode.productName,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            if (!stockText.isNullOrBlank()) {
                                Text(
                                    text = stockText,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }

                // Two-column field row
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = qtyText,
                        onValueChange = { qtyText = it },
                        label = { Text(stringResource(R.string.wizard_quantity)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        textStyle = MaterialTheme.typography.headlineSmall,
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = priceText,
                        onValueChange = { priceText = it },
                        label = { Text(stringResource(R.string.wizard_price)) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        textStyle = MaterialTheme.typography.headlineSmall,
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }

                // Итого card
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.Transparent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            brush = Brush.linearGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                                    Color.Transparent,
                                ),
                            ),
                            shape = RoundedCornerShape(14.dp),
                        )
                        .border(
                            width = 1.dp,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.20f),
                            shape = RoundedCornerShape(14.dp),
                        ),
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = stringResource(R.string.wizard_subtotal_label),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.weight(1f))
                        Text(
                            text = formatMoney(total, currency),
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }

                // Footer row
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FilledTonalButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp),
                        shape = RoundedCornerShape(50),
                    ) {
                        Text(stringResource(R.string.wizard_dialog_cancel))
                    }
                    Button(
                        onClick = { onSave(qty, price) },
                        enabled = saveEnabled,
                        modifier = Modifier
                            .weight(1f)
                            .height(46.dp),
                        shape = RoundedCornerShape(50),
                    ) {
                        Text(stringResource(R.string.wizard_dialog_save))
                    }
                }
            }
        }
    }
}

// NOTE: @Preview omitted intentionally — `androidx.compose.ui:ui-tooling-preview`
// is not on this module's compile classpath, and adding the dep is out of scope
// for this commit (single-file rule). Add the dep + a Preview function in a
// follow-up if a Studio preview is desired.
