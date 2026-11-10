package dev.ishflow.android.feature.sales.wizard

import dev.ishflow.android.apiclient.ApiService
import kotlinx.coroutines.CancellationException
import java.math.BigDecimal
import javax.inject.Inject

/**
 * Resolves the unit price the sales wizard should pre-fill for a `(productId,
 * priceTypeId)` pair.
 *
 * The server endpoint `/api/mobile/products/{id}/prices` returns every
 * resolved price type in one shot (with the dynamic-no-base `liveCost`
 * fallback introduced by iOS PR #80 already applied server-side). The
 * client just looks up the resolved item by `priceTypeId` and returns
 * its `value`.
 *
 * Mirrors iOS `PriceResolver.swift`. Comparisons are case-insensitive on the
 * UUID — the same hardening iOS PR #80 added.
 *
 * Failures are non-fatal: a network error, a 4xx, or a missing match all
 * collapse to `null` so the caller can fall back to its own default
 * (`product.salePrice ?: BigDecimal.ZERO`). Coroutine cancellation is
 * re-thrown.
 */
class PriceResolver @Inject constructor(private val api: ApiService) {

    @Suppress("TooGenericExceptionCaught", "SwallowedException")
    suspend fun resolve(productId: String, priceTypeId: String): BigDecimal? = try {
        val response = api.getProductPrices(productId)
        val target = priceTypeId.lowercase()
        response.items
            .firstOrNull { it.priceTypeId.lowercase() == target }
            ?.value
    } catch (e: CancellationException) {
        throw e
    } catch (_: Exception) {
        null
    }
}
