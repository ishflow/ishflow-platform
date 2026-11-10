package dev.ishflow.android.feature.reports

import dev.ishflow.android.R
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.TemporalAdjusters

/**
 * Three preset windows the detail screens expose as filter chips. Each
 * preset resolves to a `[from, to]` UTC instant pair so the network call
 * is deterministic regardless of device timezone.
 *
 * The default is [LAST_30_DAYS] — matches the web `/reports` page.
 */
enum class ReportPeriodPreset(val labelRes: Int) {
    LAST_7_DAYS(R.string.reports_period_last_7_days),
    LAST_30_DAYS(R.string.reports_period_last_30_days),
    THIS_MONTH(R.string.reports_period_this_month);

    fun resolve(now: Instant = Instant.now()): Pair<Instant, Instant> {
        val today = LocalDate.ofInstant(now, ZoneOffset.UTC)
        return when (this) {
            LAST_7_DAYS -> Pair(
                today.minusDays(7).atStartOfDay(ZoneOffset.UTC).toInstant(),
                now,
            )
            LAST_30_DAYS -> Pair(
                today.minusDays(30).atStartOfDay(ZoneOffset.UTC).toInstant(),
                now,
            )
            THIS_MONTH -> Pair(
                today.with(TemporalAdjusters.firstDayOfMonth())
                    .atStartOfDay(ZoneOffset.UTC).toInstant(),
                now,
            )
        }
    }
}
