package dev.ishflow.android.core.ui.aurora

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Translucent frosted-glass card anchored to the bottom of an onboarding
 * screen, holding the headline, subtitle and CTAs (mockup `.glass`).
 * Compose has no live backdrop blur, so we approximate the frosted look
 * with a high-alpha translucent fill + hairline border + soft shadow over
 * the animated [AuroraBackground], matching the HTML's light/dark palettes.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(32.dp)
    val fill = if (dark) Color(0xFF0C121E).copy(alpha = 0.62f) else Color.White.copy(alpha = 0.74f)
    val borderColor = if (dark) Color.White.copy(alpha = 0.14f) else Color.White.copy(alpha = 0.85f)

    Column(
        modifier = modifier
            .shadow(elevation = 28.dp, shape = shape, clip = false)
            .clip(shape)
            .background(fill, shape)
            .border(1.dp, borderColor, shape)
            .padding(horizontal = 23.dp, vertical = 26.dp),
        content = content,
    )
}

/** Headline text token for the glass card (mockup `.hl`). */
@Composable
fun GlassHeadline(text: String, dark: Boolean = isSystemInDarkTheme(), modifier: Modifier = Modifier) {
    Text(
        text = text,
        color = if (dark) Color.White else Color(0xFF06183A),
        fontSize = 30.sp,
        lineHeight = 33.sp,
        fontWeight = FontWeight.ExtraBold,
        modifier = modifier,
    )
}

/** Subtitle text token for the glass card (mockup `.sub`). */
@Composable
fun GlassSubtitle(text: String, dark: Boolean = isSystemInDarkTheme(), modifier: Modifier = Modifier) {
    Text(
        text = text,
        color = if (dark) Color.White.copy(alpha = 0.80f) else Color(0xFF2F4A73),
        fontSize = 15.5f.sp,
        lineHeight = 22.sp,
        modifier = modifier,
    )
}

/** Feature pill row item (mockup `.pill`). */
@Composable
fun FeaturePill(
    label: String,
    icon: ImageVector,
    dark: Boolean = isSystemInDarkTheme(),
    modifier: Modifier = Modifier,
) {
    val bg = if (dark) Color.White.copy(alpha = 0.12f) else Color(0xFF0F5EEF).copy(alpha = 0.10f)
    val border = if (dark) Color.White.copy(alpha = 0.20f) else Color(0xFF0F5EEF).copy(alpha = 0.22f)
    val fg = if (dark) Color.White else Color(0xFF0D3A8A)
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(999.dp))
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = fg, modifier = Modifier.size(15.dp))
        Text(text = label, color = fg, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

/** Page-indicator dots (mockup `.dots`); the active dot is an elongated pill. */
@Composable
fun PageDots(
    count: Int,
    active: Int,
    dark: Boolean = isSystemInDarkTheme(),
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val activeColor = if (dark) Color.White else Color(0xFF0F5EEF)
        val idleColor = if (dark) Color.White.copy(alpha = 0.40f) else Color(0xFF143778).copy(alpha = 0.28f)
        repeat(count) { i ->
            val on = i == active
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (on) activeColor else idleColor)
                    .then(
                        if (on) Modifier.width(24.dp).height(7.dp) else Modifier.size(7.dp),
                    ),
            )
        }
    }
}

/**
 * Shared helper used by [GlassMark]/[GlassCard] family: paints a translucent
 * fill clipped to [shape]. Kept here so the glass look stays consistent.
 */
internal fun Modifier.glassBackground(color: Color, shape: Shape): Modifier =
    this.background(color, shape)
