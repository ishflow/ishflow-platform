package dev.ishflow.android.core.ui

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Compose's [androidx.compose.foundation.BorderStroke] doesn't support
 * dashed strokes natively. This modifier draws a dashed rounded-rect
 * border using a [PathEffect.dashPathEffect].
 *
 * Used by the sales wizard's "Дата / Тип цены / Склад" chips.
 */
fun Modifier.dashedBorder(
    color: Color,
    strokeWidth: Dp = 1.2.dp,
    cornerRadius: Dp = 999.dp,
    dashLength: Dp = 4.dp,
    gapLength: Dp = 4.dp,
): Modifier = drawWithCache {
    val w = strokeWidth.toPx()
    val stroke = Stroke(
        width = w,
        pathEffect = PathEffect.dashPathEffect(
            floatArrayOf(dashLength.toPx(), gapLength.toPx()),
            phase = 0f,
        ),
    )
    val r = CornerRadius(cornerRadius.toPx())
    onDrawWithContent {
        drawContent()
        drawRoundRect(
            color = color,
            style = stroke,
            cornerRadius = r,
            topLeft = Offset(w / 2, w / 2),
            size = Size(size.width - w, size.height - w),
        )
    }
}
