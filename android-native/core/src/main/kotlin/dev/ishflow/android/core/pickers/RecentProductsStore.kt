package dev.ishflow.android.core.pickers

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory ordered list of recently picked product IDs. Survives navigation
 * within the app session; resets on process death. Cap is small (3) so the
 * sales-wizard search dropdown can surface the freshest picks the instant
 * the user focuses the field — replacing the blank surface that otherwise
 * sat between the search field and the keyboard.
 *
 * Stores IDs only — consumers resolve IDs → CatalogRecord against the live
 * catalog so a stale record (renamed/deleted) is filtered out naturally.
 */
@Singleton
class RecentProductsStore @Inject constructor() {
    private val _ids = MutableStateFlow<List<String>>(emptyList())
    val ids: StateFlow<List<String>> = _ids.asStateFlow()

    /**
     * Pushes [productId] to the front, deduplicates, and trims to [MAX_RECENTS].
     */
    fun push(productId: String) {
        if (productId.isBlank()) return
        val deduped = _ids.value.filter { it != productId }
        _ids.value = (listOf(productId) + deduped).take(MAX_RECENTS)
    }

    private companion object {
        const val MAX_RECENTS = 3
    }
}
