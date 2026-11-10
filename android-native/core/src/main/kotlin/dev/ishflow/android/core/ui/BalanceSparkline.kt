package dev.ishflow.android.core.ui

import androidx.compose.foundation.Canvas
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/**
 * Lightweight balance trend chart. Draws a single polyline across the
 * available canvas width, scaling Y to the visible value range so even a
 * tight delta still produces a readable curve. Two or more samples are
 * required — single-point or empty inputs render nothing rather than
 * forcing a synthetic flat line.
 *
 * Caller passes raw `Float` samples in chronological order; the composable
 * never owns the data layout. Color follows `colorScheme.primary` so the
 * line tracks light/dark theme without explicit recomposition.
 */
@Composable
fun BalanceSparkline(
    points: List<Float>,
    modifier: Modifier = Modifier,
) {
    if (points.size < 2) return
    val lineColor = MaterialTheme.colorScheme.primary
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val min = points.min()
        val max = points.max()
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val stepX = width / (points.size - 1).coerceAtLeast(1)
        val path = Path()
        points.forEachIndexed { i, v ->
            val x = i * stepX
            val y = height - ((v - min) / range) * height
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(
            path = path,
            color = lineColor,
            style = Stroke(width = 2.dp.toPx()),
        )
    }
}
