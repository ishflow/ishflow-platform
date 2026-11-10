package dev.ishflow.android.core.ui.money

import androidx.compose.runtime.compositionLocalOf
import java.math.BigDecimal
import java.text.NumberFormat

/**
 * Active tenant's currency code (ISO 4217, e.g. `"TRY"`), provided by the shell
 * from the cached `/me` response.
 *
 * Read this for every monetary display — NEVER `NumberFormat.getCurrencyInstance()`,
 * which derives the currency from the **device** locale. A ru-RU phone on a TRY
 * tenant therefore rendered `₽`, and various screens hard-coded `"с"` / `"сом"`.
 * Routing all money through the tenant code keeps the symbol consistent and
 * correct across dashboard, documents, wizard and reports.
 *
 * Defaults to `""` (render the number with no currency suffix) for the brief
 * window before the session loads — better an unlabelled amount than a concrete
 * wrong code (a RUB tenant would otherwise flash "TRY").
 */
val LocalTenantCurrency = compositionLocalOf { "" }

/**
 * Formats [amount] as e.g. `"1 234,50 TRY"` — the number is grouped per the
 * device locale (so Russian users still get familiar separators) while the
 * currency is the tenant's ISO code, appended as a suffix (mirrors the dashboard).
 */
fun formatMoney(amount: BigDecimal, currencyCode: String): String {
    val number = NumberFormat.getNumberInstance().apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }.format(amount)
    return if (currencyCode.isBlank()) number else "$number $currencyCode"
}
