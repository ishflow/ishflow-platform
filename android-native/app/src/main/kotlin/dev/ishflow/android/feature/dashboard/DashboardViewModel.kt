package dev.ishflow.android.feature.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.api.toApiException
import dev.ishflow.android.appshared.models.DashboardResponse
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.WidgetDescriptor
import dev.ishflow.android.core.RefreshTrigger
import dev.ishflow.android.core.store.DashboardPreferences
import dev.ishflow.android.core.store.DashboardStyleStore
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject

/**
 * Currency string ("USD", "RUB", ...) plumbed from the active tenant so the
 * Glance-and-Act widgets can format monetary values without a second fetch.
 */
typealias TenantCurrency = String

/**
 * Legacy KPI-strip state — kept as the resilience fallback when the
 * `/api/mobile/dashboard` call returns no slots (or fails). Renders three
 * registers + a recent-invoices list using the lower-level
 * `registerBalance` / `listDocuments` endpoints.
 */
sealed class DashboardUiState {
    data object Loading : DashboardUiState()
    data class Loaded(
        val receivable: BigDecimal,
        val payable: BigDecimal,
        val stock: BigDecimal,
        val recentDocuments: List<DocumentRecord>,
    ) : DashboardUiState()
    data class Failed(val exception: ApiException) : DashboardUiState()
}

/**
 * Slot-grouped projection of [DashboardResponse]. The screen walks `hero`,
 * `actions`, `activity` to render the three Glance-and-Act sections. Other
 * slots (e.g. `trends`) are forward-compat: they ride along inside
 * [extraSlots] but the current UI ignores them.
 */
internal data class DashboardLayoutBundle(
    val currency: TenantCurrency,
    val hero: List<WidgetDescriptor> = emptyList(),
    val actions: List<WidgetDescriptor> = emptyList(),
    val activity: List<WidgetDescriptor> = emptyList(),
    val extraSlots: Map<String, List<WidgetDescriptor>> = emptyMap(),
    /**
     * Count of products currently below their safety stock threshold. Derived
     * from the `action.lowStock` widget's `data.count` field so the banner
     * stays in sync with the action-queue row without a second fetch. Zero
     * (or absent widget) hides the banner entirely.
     */
    val lowStockCount: Int = 0,
) {
    val isEmpty: Boolean
        get() = hero.isEmpty() && actions.isEmpty() && activity.isEmpty() && extraSlots.isEmpty()
}

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val api: ApiService,
    private val refreshTrigger: RefreshTrigger,
    styleStore: DashboardStyleStore,
    private val prefs: DashboardPreferences,
) : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing

    private val _layoutBundle = MutableStateFlow<DashboardLayoutBundle?>(null)
    internal val layoutBundle: StateFlow<DashboardLayoutBundle?> = _layoutBundle

    /**
     * User-selected layout variant — drives the Hero/PastelBento/Charts
     * dispatch in [DashboardScreen]. Hot-collected so the picker change
     * lights up the screen immediately, with [DashboardStyle.HERO] as the
     * sync default before the DataStore returns its first value.
     */
    internal val style: StateFlow<DashboardStyle> = styleStore.style
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STYLE_STOP_TIMEOUT_MS), DashboardStyle.HERO)

    /**
     * Whether the setup-progress widget should render. Inverted view of the
     * persisted "dismissed" flag. Starts as `true` so first composition shows
     * the widget while we wait for the DataStore's first emission — first
     * launch should never flash blank.
     */
    internal val setupProgressVisible: StateFlow<Boolean> = prefs.setupProgressDismissed
        .map { !it }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STYLE_STOP_TIMEOUT_MS), true)

    fun dismissSetupProgress() {
        viewModelScope.launch {
            prefs.setSetupProgressDismissed(true)
        }
    }

    init {
        viewModelScope.launch {
            refreshTrigger.events.collect { refresh() }
        }
        refresh()
    }

    @Suppress("TooGenericExceptionCaught", "InstanceOfCheckForException")
    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            if (_uiState.value !is DashboardUiState.Loaded && _layoutBundle.value == null) {
                _uiState.value = DashboardUiState.Loading
            }
            try {
                coroutineScope {
                    // Try the rich server-driven layout first. Fall through to
                    // the legacy KPI strip if it's empty or fails — the legacy
                    // path uses different endpoints so it can succeed even when
                    // dashboard-layout has no widgets for this role.
                    val dashboardDeferred = async { runCatching { api.getDashboardLayout() }.getOrNull() }
                    val legacyDeferred = async { runCatching { fetchLegacyKpis() }.getOrNull() }

                    val dashboard = dashboardDeferred.await()
                    val bundle = dashboard?.let { buildBundle(it) }

                    _layoutBundle.value = bundle?.takeUnless { it.isEmpty }

                    // Always populate the legacy state too so the screen can
                    // fall back when the bundle is null/empty without a second
                    // refresh round-trip.
                    val legacy = legacyDeferred.await()
                    if (legacy != null) {
                        _uiState.value = legacy
                    } else if (_uiState.value !is DashboardUiState.Loaded) {
                        _uiState.value = DashboardUiState.Failed(
                            ApiException.Decoding(IllegalStateException("dashboard fetch failed")),
                        )
                    }
                }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                if (_uiState.value !is DashboardUiState.Loaded) {
                    _uiState.value = DashboardUiState.Failed(e.toApiException())
                }
            } finally {
                _refreshing.value = false
            }
        }
    }

    private suspend fun fetchLegacyKpis(): DashboardUiState.Loaded = coroutineScope {
        val receivableDeferred = async { api.registerBalance("ar.receivable") }
        val payableDeferred = async { api.registerBalance("ap.payable") }
        val stockDeferred = async { api.registerBalance("inventory.stock") }
        val docsDeferred = async { api.listDocuments("sales.invoice", pageSize = RECENT_DOC_LIMIT) }

        val receivable = receivableDeferred.await()
        val payable = payableDeferred.await()
        val stock = stockDeferred.await()
        val docs = docsDeferred.await()

        val recSum = receivable.rows.fold(BigDecimal.ZERO) { acc, row ->
            acc.add(row.cost ?: BigDecimal.ZERO)
        }
        val paySum = payable.rows.fold(BigDecimal.ZERO) { acc, row ->
            acc.add(row.cost ?: BigDecimal.ZERO)
        }
        val stockSum = stock.rows.fold(BigDecimal.ZERO) { acc, row ->
            acc.add(row.quantity ?: BigDecimal.ZERO)
        }

        DashboardUiState.Loaded(
            receivable = recSum,
            payable = paySum,
            stock = stockSum,
            recentDocuments = docs.items,
        )
    }

    private fun buildBundle(response: DashboardResponse): DashboardLayoutBundle {
        val bySlot = response.layout.associate { it.slot to it.widgets }
        val knownSlots = setOf(SLOT_HERO, SLOT_ACTIONS, SLOT_ACTIVITY)
        val extras = bySlot.filterKeys { it !in knownSlots }
        val actionsSlot = bySlot[SLOT_ACTIONS].orEmpty()
        // Derive the low-stock count from the action queue widget so the banner
        // and the queue row never disagree. The server already aggregates this
        // value into `data.count` — no dedicated /low-stock-count endpoint
        // needed.
        val lowStock = actionsSlot.firstOrNull { it.id == WIDGET_ACTION_LOW_STOCK }?.kpiCount ?: 0
        return DashboardLayoutBundle(
            currency = response.tenant?.currency ?: DEFAULT_CURRENCY,
            hero = bySlot[SLOT_HERO].orEmpty(),
            actions = actionsSlot,
            activity = bySlot[SLOT_ACTIVITY].orEmpty(),
            extraSlots = extras,
            lowStockCount = lowStock,
        )
    }

    private companion object {
        const val RECENT_DOC_LIMIT = 5
        const val DEFAULT_CURRENCY = "USD"

        const val SLOT_HERO = "hero"
        const val SLOT_ACTIONS = "actions"
        const val SLOT_ACTIVITY = "activity"

        const val WIDGET_ACTION_LOW_STOCK = "action.lowStock"

        const val STYLE_STOP_TIMEOUT_MS = 5_000L
    }
}
