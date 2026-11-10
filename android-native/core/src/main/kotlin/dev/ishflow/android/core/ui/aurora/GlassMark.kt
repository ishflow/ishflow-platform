package dev.ishflow.android.core.ui.aurora

import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/**
 * Frosted "glass mark" icon tile shown above the [GlassCard] on each
 * onboarding screen — the small rounded translucent square with a brand
 * glyph (mockup `.mark`). Light/dark variants mirror the HTML spec.
 */
@Composable
fun GlassMark(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    dark: Boolean = isSystemInDarkTheme(),
) {
    val glyph = if (dark) Color.White else Color(0xFF0F5EEF)
    GlassMark(modifier = modifier, dark = dark) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = glyph,
            modifier = Modifier.size(34.dp),
        )
    }
}

/**
 * Content-slot variant of [GlassMark] — embeds arbitrary [content] (e.g. the
 * brand logo Image) inside the frosted tile instead of a tinted icon.
 */
@Composable
fun GlassMark(
    modifier: Modifier = Modifier,
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val tile = if (dark) Color.White.copy(alpha = 0.18f) else Color.White.copy(alpha = 0.70f)
    val borderColor = if (dark) {
        Color.White.copy(alpha = 0.40f)
    } else {
        // #B0E9FD ~ cyan hairline in light mode
        Color(0xFFB0E9FD).copy(alpha = 0.90f)
    }

    Box(
        modifier = modifier
            .size(66.dp)
            .shadow(elevation = 18.dp, shape = RoundedCornerShape(19.dp), clip = false)
            .clip(RoundedCornerShape(19.dp))
            .border(1.dp, borderColor, RoundedCornerShape(19.dp))
            .glassBackground(tile, RoundedCornerShape(19.dp)),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}
