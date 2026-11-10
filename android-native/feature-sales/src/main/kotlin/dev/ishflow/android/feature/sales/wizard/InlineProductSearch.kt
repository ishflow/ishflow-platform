package dev.ishflow.android.feature.sales.wizard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.ui.money.LocalTenantCurrency
import dev.ishflow.android.core.ui.money.formatMoney
import dev.ishflow.android.core.pickers.ProductPickerUiState
import dev.ishflow.android.core.pickers.ProductPickerViewModel
import dev.ishflow.android.feature.sales.R
import java.math.BigDecimal

/**
 * Inline product search field with autocomplete dropdown for the sales
 * wizard. Replaces the modal product picker sheet — the user types,
 * sees up to six matches with a "create new" affordance, and either
 * taps a match or escalates to the full create flow.
 *
 * The dropdown badge column is intentionally neutral; per-line stock
 * coloring lives on the items list, not the autocomplete row.
 */
@Composable
fun InlineProductSearch(
    warehouseId: String?,
    priceTypeId: String?,
    onProductPicked: (product: CatalogRecord, resolvedPrice: BigDecimal) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProductPickerViewModel = hiltViewModel(),
) {
    var query by remember { mutableStateOf("") }
    // Field-only interaction source — keeps `collectIsFocusedAsState` clean
    // from press emissions when the user taps the surrounding Surface.
    val fieldInteractionSource = remember { MutableInteractionSource() }
    val focused by fieldInteractionSource.collectIsFocusedAsState()
    // Mirrors `focused` via onFocusChanged so the dropdown render gate is
    // driven by an explicit state, not the interactionSource flow (which has
    // bitten us with delayed/dropped recomposition in the past).
    var open by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val currency = LocalTenantCurrency.current
    val state by viewModel.uiState.collectAsState()
    val totalStockByProduct by viewModel.totalStockByProduct.collectAsState()
    val priceByProduct by viewModel.priceByProduct.collectAsState()
    val recentProducts by viewModel.recentProducts.collectAsState()
    val products = (state as? ProductPickerUiState.Loaded)?.products.orEmpty()
        .take(MAX_VISIBLE_PRODUCTS)

    LaunchedEffect(warehouseId) { viewModel.setWarehouse(warehouseId) }
    LaunchedEffect(priceTypeId) { viewModel.setPriceType(priceTypeId) }
    LaunchedEffect(query) { viewModel.search(query) }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(50),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight()
                    .border(
                        border = BorderStroke(
                            width = if (focused) 1.5.dp else 1.dp,
                            color = if (focused) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outlineVariant
                            },
                        ),
                        shape = RoundedCornerShape(50),
                    )
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { focusRequester.requestFocus() },
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxHeight()
                        .padding(horizontal = 14.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Search,
                        contentDescription = null,
                        tint = if (focused) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                    Spacer(Modifier.width(8.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        BasicTextField(
                            value = query,
                            onValueChange = { query = it },
                            singleLine = true,
                            textStyle = LocalTextStyle.current.copy(
                                color = MaterialTheme.colorScheme.onSurface,
                            ),
                            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            interactionSource = fieldInteractionSource,
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(focusRequester)
                                .onFocusChanged { open = it.isFocused },
                        )
                        if (query.isEmpty()) {
                            Text(
                                text = stringResource(R.string.wizard_search_product),
                                style = LocalTextStyle.current,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }

        // Dropdown opens when the search field is focused. Content depends on
        // query state: empty query → recently-picked products if any, otherwise
        // the first few catalog products so focusing the field surfaces something
        // to scan/pick instead of a blank surface above the keyboard; typed query
        // → live search results. A truly empty (or fully filtered-out) catalog
        // still renders nothing.
        val queryTrimmed = query.trim()
        val isSearching = queryTrimmed.isNotEmpty()
        val recents = recentProducts.take(MAX_VISIBLE_PRODUCTS)
        val rows = when {
            isSearching -> products
            recents.isNotEmpty() -> recents
            else -> products // empty focus, no recents → surface a few catalog products
        }
        val showDropdown = open && (rows.isNotEmpty() || isSearching)
        if (showDropdown) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (!isSearching && recents.isNotEmpty()) {
                        Text(
                            text = stringResource(R.string.wizard_recent_products_title),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(
                                start = 14.dp,
                                end = 14.dp,
                                top = 10.dp,
                                bottom = 4.dp,
                            ),
                        )
                    }
                    if (rows.isEmpty()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                        ) {
                            Text(
                                text = "…",
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    } else {
                        rows.forEachIndexed { index, product ->
                            if (index > 0) HorizontalDivider()
                            // Resolve the dropdown's displayed price once so the
                            // tap callback can pass the same value to the dialog —
                            // keeping what the user sees here in lockstep with the
                            // line's initial price.
                            val resolvedPrice = priceByProduct[product.id]
                                ?: product.salePrice
                                ?: BigDecimal.ZERO
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        // Drop focus before delegating up so the
                                        // keyboard dismisses and the dropdown
                                        // collapses (open is wired to focus via
                                        // onFocusChanged above) — otherwise the
                                        // search surface keeps obscuring the
                                        // wizard while the dialog animates in.
                                        focusManager.clearFocus()
                                        onProductPicked(product, resolvedPrice)
                                    }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                    modifier = Modifier.size(34.dp),
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Icon(
                                            imageVector = Icons.Filled.Inventory2,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.padding(7.dp),
                                        )
                                    }
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = product.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    val meta = buildString {
                                        product.code?.takeIf { it.isNotBlank() }?.let {
                                            append(it)
                                            append(" · ")
                                        }
                                        append(
                                            if (resolvedPrice > BigDecimal.ZERO) {
                                                formatMoney(resolvedPrice, currency)
                                            } else {
                                                "—"
                                            },
                                        )
                                    }
                                    Text(
                                        text = meta,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                Spacer(Modifier.width(10.dp))
                                val stock = totalStockByProduct[product.id]
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                ) {
                                    Text(
                                        text = stringResource(
                                            R.string.wizard_dropdown_stock_format,
                                            stock?.stripTrailingZeros()?.toPlainString() ?: "—",
                                        ),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(
                                            horizontal = 8.dp,
                                            vertical = 4.dp,
                                        ),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private const val MAX_VISIBLE_PRODUCTS = 3
