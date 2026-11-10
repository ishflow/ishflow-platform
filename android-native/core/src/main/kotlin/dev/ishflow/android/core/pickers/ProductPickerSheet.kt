package dev.ishflow.android.core.pickers

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SearchBar
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.CatalogRecord
import dev.ishflow.android.core.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun ProductPickerSheet(
    onProductSelected: (CatalogRecord) -> Unit,
    onDismiss: () -> Unit,
    /**
     * When non-null, restricts the picker to products with positive stock at
     * this warehouse — passed by the sales wizard once the user picks a
     * warehouse so they don't try to sell something the warehouse doesn't
     * stock. Null for non-stock contexts (purchase wizard, etc.).
     */
    warehouseId: String? = null,
    viewModel: ProductPickerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(warehouseId) {
        viewModel.setWarehouse(warehouseId)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
        ) {
            when (val state = uiState) {
                is ProductPickerUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }

                is ProductPickerUiState.Failed -> {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = state.message.ifEmpty { stringResource(R.string.error_loading) },
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }

                is ProductPickerUiState.Loaded -> {
                    SearchBar(
                        query = state.query,
                        onQueryChange = { viewModel.search(it) },
                        onSearch = { },
                        active = false,
                        onActiveChange = { },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        placeholder = { Text(stringResource(R.string.picker_search_products)) },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    ) {}

                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (state.products.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = stringResource(R.string.error_loading),
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        } else {
                            items(state.products) { product ->
                                ListItem(
                                    headlineContent = { Text(product.name) },
                                    supportingContent = product.code?.let { { Text(it) } },
                                    modifier = Modifier.clickable {
                                        onProductSelected(product)
                                        onDismiss()
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
