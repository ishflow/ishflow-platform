package dev.ishflow.android.feature.dashboard.widgets

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import kotlin.math.PI
import kotlin.math.sin
import kotlinx.coroutines.runBlocking

private const val SPARK_HEIGHT_DP = 48
private const val SYNTHETIC_POINTS = 12

/**
 * Tiny line chart sitting under the hero KPI's value. Renders the
 * server-emitted [points] when present, or a synthesized preview derived
 * from [deltaPct] otherwise (so the visual ships ahead of the server
 * contract that will populate `widget.data.series`).
 *
 * Styling is left to Vico's Material 3 defaults — the active scheme's
 * primary color drives the line tint, so the spark sits naturally on the
 * hero card's `primaryContainer` background in both light and dark mode.
 */
@Composable
internal fun HeroSparkline(
    points: List<Double>?,
    deltaPct: Double,
    modifier: Modifier = Modifier,
) {
    val series = points?.takeIf { it.size >= 2 } ?: syntheticSeries(deltaPct)
    val producer = remember(series) {
        CartesianChartModelProducer().also {
            runBlocking { it.runTransaction { lineSeries { series(series) } } }
        }
    }
    CartesianChartHost(
        chart = rememberCartesianChart(rememberLineCartesianLayer()),
        modelProducer = producer,
        modifier = modifier
            .fillMaxWidth()
            .height(SPARK_HEIGHT_DP.dp),
    )
}

/**
 * Builds a 12-point preview series biased by the delta direction. Positive
 * delta produces a gentle upward wave, negative a downward wave, zero a
 * flat sine. Strictly for visual scaffolding — the moment the server
 * starts emitting `widget.data.series`, the real values override this.
 */
private fun syntheticSeries(deltaPct: Double): List<Double> {
    val trend = deltaPct / 100.0
    return (0 until SYNTHETIC_POINTS).map { i ->
        val phase = i * (PI / 4)
        val wave = sin(phase) * 0.15
        1.0 + wave + (i.toDouble() / SYNTHETIC_POINTS) * trend
    }
}
