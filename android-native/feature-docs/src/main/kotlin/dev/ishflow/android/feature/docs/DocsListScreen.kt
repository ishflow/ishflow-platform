package dev.ishflow.android.feature.docs

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.RequestQuote
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.ui.EmptyState
import dev.ishflow.android.appshared.ui.ErrorState
import dev.ishflow.android.appshared.ui.PullRefreshHost
import dev.ishflow.android.appshared.ui.stringRes
import dev.ishflow.android.core.ui.AppTopBar
import dev.ishflow.android.core.ui.Haptics
import dev.ishflow.android.core.ui.LocalShellActions
import dev.ishflow.android.feature.docs.filter.DocsFilterSheet
import dev.ishflow.android.feature.docs.filter.DocsFilterState
import java.math.BigDecimal
import java.text.NumberFormat
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import dev.ishflow.android.appshared.R as SharedR

private val ChipSpacing = 8.dp
private val ChipRowContentPaddingH = 16.dp
private val ChipRowVerticalPadding = 8.dp
private val ListWrapHorizontalPadding = 12.dp
private val ListWrapCornerRadius = 18.dp
private val RowVerticalPadding = 12.dp
private val RowHorizontalPadding = 14.dp
private val RowInternalSpacing = 12.dp
private val AvatarTileSize = 38.dp
private val AvatarTileCornerRadius = 11.dp
private val AvatarIconSize = 20.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocsListScreen(
    onRowClick: (DocumentSummary) -> Unit,
    viewModel: DocsListViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    val advancedFilter by viewModel.advancedFilter.collectAsStateWithLifecycle()
    val query by viewModel.query.collectAsStateWithLifecycle()

    DocsListScreenContent(
        uiState = uiState,
        isRefreshing = isRefreshing,
        filter = filter,
        advancedFilter = advancedFilter,
        query = query,
        onQueryChange = viewModel::setQuery,
        onFilterSelect = viewModel::selectFilter,
        onApplyAdvancedFilter = viewModel::applyAdvancedFilter,
        onRefresh = viewModel::refresh,
        onRowClick = onRowClick,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
internal fun DocsListScreenContent(
    uiState: DocsListUiState,
    isRefreshing: Boolean,
    filter: DocsFilter,
    advancedFilter: DocsFilterState,
    query: String,
    onQueryChange: (String) -> Unit,
    onFilterSelect: (DocsFilter) -> Unit,
    onApplyAdvancedFilter: (DocsFilterState) -> Unit,
    onRefresh: () -> Unit,
    onRowClick: (DocumentSummary) -> Unit,
) {
    val refreshHaptic = Haptics.rememberClickHaptic()
    val hapticRefresh: () -> Unit = { refreshHaptic(); onRefresh() }
    var showFilterSheet by remember { mutableStateOf(false) }
    var isSearchOpen by remember { mutableStateOf(false) }
    val searchFocus = remember { FocusRequester() }
    LaunchedEffect(isSearchOpen) {
        if (isSearchOpen) {
            // Defer one frame so the OutlinedTextField is in the tree before
            // we ask for focus — otherwise the request silently drops.
            runCatching { searchFocus.requestFocus() }
        }
    }
    val closeSearch = {
        isSearchOpen = false
        onQueryChange("")
    }
    val shell = LocalShellActions.current
    val title = stringResource(R.string.docs_tab_title)
    val filterCd = stringResource(R.string.docs_filter_title)
    val searchOpenCd = stringResource(R.string.docs_search_open)
    Scaffold(
        topBar = {
            AppTopBar(
                title = title,
                onAvatarClick = shell.onAvatarClick,
                onBellClick = shell.onBellClick,
                avatarInitial = shell.avatarInitial,
                notificationBadge = shell.notificationBadge,
                extraActions = {
                    IconButton(
                        onClick = { isSearchOpen = true },
                        modifier = Modifier.testTag("docs_search_button"),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Search,
                            contentDescription = searchOpenCd,
                        )
                    }
                    IconButton(
                        onClick = { showFilterSheet = true },
                        modifier = Modifier.testTag("docs_filter_button"),
                    ) {
                        BadgedBox(
                            badge = {
                                if (advancedFilter.activeCount > 0) {
                                    Badge { Text(advancedFilter.activeCount.toString()) }
                                }
                            },
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Tune,
                                contentDescription = filterCd,
                            )
                        }
                    }
                },
            )
        },
    ) { padding ->
        PullRefreshHost(
            isRefreshing = isRefreshing,
            onRefresh = hapticRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (val state = uiState) {
                is DocsListUiState.Loading -> LoadingBox()
                is DocsListUiState.Failed -> ErrorState(
                    icon = Icons.Filled.ErrorOutline,
                    title = stringResource(R.string.docs_error_title),
                    message = stringResource(state.exception.stringRes()),
                    ctaLabel = stringResource(R.string.docs_action_retry),
                    onCtaClick = onRefresh,
                )

                is DocsListUiState.Loaded -> LoadedBody(
                    state = state,
                    filter = filter,
                    query = query,
                    isSearchOpen = isSearchOpen,
                    searchFocus = searchFocus,
                    onQueryChange = onQueryChange,
                    onCloseSearch = closeSearch,
                    onFilterSelect = onFilterSelect,
                    onRefresh = onRefresh,
                    onRowClick = onRowClick,
                )
            }
        }
    }

    if (showFilterSheet) {
        DocsFilterSheet(
            initial = advancedFilter,
            onApply = { next ->
                onApplyAdvancedFilter(next)
                showFilterSheet = false
            },
            onDismiss = { showFilterSheet = false },
        )
    }
}

@Composable
private fun LoadingBox() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun LoadedBody(
    state: DocsListUiState.Loaded,
    filter: DocsFilter,
    query: String,
    isSearchOpen: Boolean,
    searchFocus: FocusRequester,
    onQueryChange: (String) -> Unit,
    onCloseSearch: () -> Unit,
    onFilterSelect: (DocsFilter) -> Unit,
    onRefresh: () -> Unit,
    onRowClick: (DocumentSummary) -> Unit,
) {
    val filteredRows = remember(state.rows, query) { applyQuery(state.rows, query) }
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item(key = "docs_header") {
            if (isSearchOpen) {
                DocsSearchBar(
                    query = query,
                    focusRequester = searchFocus,
                    onValueChange = onQueryChange,
                    onClose = onCloseSearch,
                )
            } else {
                DocsFilterChipRow(
                    selected = filter,
                    onSelect = onFilterSelect,
                )
            }
        }
        if (filteredRows.isEmpty()) {
            item {
                EmptyState(
                    icon = Icons.Filled.Inbox,
                    title = stringResource(R.string.docs_empty_title),
                    ctaLabel = stringResource(R.string.docs_action_refresh),
                    onCtaClick = onRefresh,
                )
            }
        } else {
            itemsIndexed(filteredRows, key = { _, summary -> summary.kindKey() }) { index, summary ->
                val shape = rowShape(index = index, lastIndex = filteredRows.lastIndex)
                DocsRowV1(
                    summary = summary,
                    shape = shape,
                    showDivider = index > 0,
                    onClick = { onRowClick(summary) },
                )
            }
        }
    }
}

private fun rowShape(index: Int, lastIndex: Int): Shape = when {
    lastIndex == 0 -> RoundedCornerShape(ListWrapCornerRadius)
    index == 0 -> RoundedCornerShape(
        topStart = ListWrapCornerRadius,
        topEnd = ListWrapCornerRadius,
    )
    index == lastIndex -> RoundedCornerShape(
        bottomStart = ListWrapCornerRadius,
        bottomEnd = ListWrapCornerRadius,
    )
    else -> RoundedCornerShape(0.dp)
}

private fun applyQuery(rows: List<DocumentSummary>, query: String): List<DocumentSummary> {
    val trimmed = query.trim()
    if (trimmed.isEmpty()) return rows
    val needle = trimmed.lowercase(Locale.getDefault())
    return rows.filter { summary ->
        summary.number.lowercase(Locale.getDefault()).contains(needle) ||
            summary.counterpartyName?.lowercase(Locale.getDefault())?.contains(needle) == true
    }
}

@Composable
private fun DocsSearchBar(
    query: String,
    focusRequester: FocusRequester,
    onValueChange: (String) -> Unit,
    onClose: () -> Unit,
) {
    val placeholder = stringResource(R.string.docs_search_placeholder)
    val closeCd = stringResource(R.string.docs_search_close)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = ChipRowContentPaddingH, vertical = ChipRowVerticalPadding)
            .testTag("docs_search_bar"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(ChipSpacing),
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder) },
            leadingIcon = {
                Icon(imageVector = Icons.Filled.Search, contentDescription = null)
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            modifier = Modifier
                .weight(1f)
                .focusRequester(focusRequester)
                .testTag("docs_search_field"),
        )
        IconButton(
            onClick = onClose,
            modifier = Modifier.testTag("docs_search_close"),
        ) {
            Icon(imageVector = Icons.Filled.Close, contentDescription = closeCd)
        }
    }
}

@Composable
private fun DocsFilterChipRow(
    selected: DocsFilter,
    onSelect: (DocsFilter) -> Unit,
) {
    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = ChipRowVerticalPadding)
            .testTag("docs_filter_row"),
        contentPadding = PaddingValues(horizontal = ChipRowContentPaddingH),
        horizontalArrangement = Arrangement.spacedBy(ChipSpacing),
    ) {
        items(DocsFilter.ALL, key = { it.testKey() }) { option ->
            FilterChip(
                selected = option == selected,
                onClick = { onSelect(option) },
                label = { Text(stringResource(option.labelRes)) },
                modifier = Modifier.testTag("docs_filter_chip_${option.testKey()}"),
            )
        }
    }
}

@Composable
private fun DocsRowV1(
    summary: DocumentSummary,
    shape: Shape,
    showDivider: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        shape = shape,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = ListWrapHorizontalPadding),
    ) {
        Column {
            if (showDivider) {
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                )
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onClick)
                    .padding(horizontal = RowHorizontalPadding, vertical = RowVerticalPadding)
                    .testTag("docs_row_${summary.kind.name}"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(RowInternalSpacing),
            ) {
                KindAvatar(kind = summary.kind)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = summary.number,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = subtitleFor(summary),
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = summary.total?.let(::formatTotal) ?: "—",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            fontFeatureSettings = "tnum",
                            fontSize = 14.sp,
                        ),
                    )
                    StatusPill(status = summary.status)
                }
            }
        }
    }
}

@Composable
private fun KindAvatar(kind: DocumentKind) {
    val style = kindStyle(kind)
    Box(
        modifier = Modifier
            .size(AvatarTileSize)
            .background(color = style.background, shape = RoundedCornerShape(AvatarTileCornerRadius)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = style.icon,
            contentDescription = null,
            tint = style.foreground,
            modifier = Modifier.size(AvatarIconSize),
        )
    }
}

@Composable
private fun StatusPill(status: DocumentStatus) {
    val style = statusStyle(status)
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = style.background,
    ) {
        Text(
            text = stringResource(style.labelRes),
            color = style.foreground,
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
            ),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
        )
    }
}

private data class KindStyle(
    val background: Color,
    val foreground: Color,
    val icon: ImageVector,
)

private data class StatusStyle(
    @StringRes val labelRes: Int,
    val background: Color,
    val foreground: Color,
)

@Composable
private fun kindStyle(kind: DocumentKind): KindStyle = when (kind) {
    DocumentKind.SalesInvoice -> KindStyle(
        background = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
        foreground = MaterialTheme.colorScheme.primary,
        icon = Icons.Filled.Description,
    )
    DocumentKind.PurchaseInvoice -> KindStyle(
        background = PurchaseAccent.copy(alpha = 0.10f),
        foreground = PurchaseAccent,
        icon = Icons.Filled.ShoppingCart,
    )
    DocumentKind.PaymentReceived -> KindStyle(
        background = PaymentAccent.copy(alpha = 0.10f),
        foreground = PaymentAccent,
        icon = Icons.Filled.RequestQuote,
    )
    DocumentKind.PaymentSent -> KindStyle(
        background = PaymentAccent.copy(alpha = 0.10f),
        foreground = PaymentAccent,
        icon = Icons.Filled.Payments,
    )
}

private fun statusStyle(status: DocumentStatus): StatusStyle = when (status) {
    DocumentStatus.POSTED -> StatusStyle(
        labelRes = SharedR.string.status_posted,
        background = PostedBg,
        foreground = PostedFg,
    )
    DocumentStatus.SAVED -> StatusStyle(
        labelRes = SharedR.string.status_saved,
        background = SavedBg,
        foreground = SavedFg,
    )
    DocumentStatus.DRAFT -> StatusStyle(
        labelRes = SharedR.string.status_draft,
        background = SavedBg,
        foreground = SavedFg,
    )
    DocumentStatus.CANCELLED -> StatusStyle(
        labelRes = SharedR.string.status_cancelled,
        background = CanceledBg,
        foreground = CanceledFg,
    )
}

// Brand-aligned doc-type accents — locked to specific hues because the design
// requires the same colour identity across light + dark themes.
private val PurchaseAccent = Color(0xFF7C3AED)
private val PaymentAccent = Color(0xFFD97706)

// Status pill colours — hex from the V1 mock; identical in light + dark.
private val PostedBg = Color(0xFFDCFCE7)
private val PostedFg = Color(0xFF15803D)
private val SavedBg = Color(0xFFB0E9FD) // brand secondary
private val SavedFg = Color(0xFF001A4D) // brand on-primary-container
private val CanceledBg = Color(0xFFFEE2E2)
private val CanceledFg = Color(0xFF991B1B)

@Composable
private fun subtitleFor(summary: DocumentSummary): String {
    val formattedDate = remember(summary.date) { dateFormatter.format(summary.date) }
    val name = summary.counterpartyName?.takeIf { it.isNotBlank() }
    return if (name != null) "$name · $formattedDate" else formattedDate
}

private val dateFormatter: DateTimeFormatter = DateTimeFormatter
    .ofLocalizedDate(FormatStyle.MEDIUM)
    .withZone(ZoneId.systemDefault())

private fun formatTotal(amount: BigDecimal): String {
    val fmt = NumberFormat.getNumberInstance(Locale.getDefault()).apply {
        maximumFractionDigits = 2
        minimumFractionDigits = 2
    }
    return fmt.format(amount)
}

private fun DocumentSummary.kindKey(): String = "${kind.name}:$id"

private fun DocsFilter.testKey(): String = when (this) {
    DocsFilter.All -> "all"
    DocsFilter.Sales -> "sales"
    DocsFilter.Purchases -> "purchases"
    DocsFilter.PaymentReceived -> "paymentReceived"
    DocsFilter.PaymentSent -> "paymentSent"
}
