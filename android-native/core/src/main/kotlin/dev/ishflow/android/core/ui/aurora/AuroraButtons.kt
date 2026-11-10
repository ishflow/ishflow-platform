package dev.ishflow.android.core.ui.aurora

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val CtaShape = RoundedCornerShape(27.dp)
private const val CtaHeight = 53

/**
 * Primary aurora CTA (mockup `.cta`). In light mode it's a filled brand-blue
 * pill; in dark mode it's a high-contrast white pill — exactly the HTML
 * spec. An optional trailing [trailingIcon] (the arrow glyph) mirrors the
 * mockup's "Başla →" style.
 */
@Composable
fun AuroraPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    dark: Boolean = isSystemInDarkTheme(),
    trailingIcon: ImageVector? = null,
) {
    val container = if (dark) Color.White else Color(0xFF0F5EEF)
    val content = if (dark) Color(0xFF0A1426) else Color.White
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = CtaShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = container,
            contentColor = content,
        ),
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = CtaHeight.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            if (trailingIcon != null) {
                Icon(trailingIcon, contentDescription = null, modifier = Modifier.padding(0.dp))
            }
        }
    }
}

/**
 * Ghost / outlined aurora CTA (mockup `.cta.ghost`) — transparent fill with
 * a brand-tinted hairline border.
 */
@Composable
fun AuroraGhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    dark: Boolean = isSystemInDarkTheme(),
) {
    val content = if (dark) Color.White else Color(0xFF0D3A8A)
    val border = if (dark) Color.White.copy(alpha = 0.40f) else Color(0xFF0F5EEF).copy(alpha = 0.30f)
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        shape = CtaShape,
        border = BorderStroke(1.dp, border),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = content),
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = CtaHeight.dp),
    ) {
        Text(text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
    }
}

/**
 * Centered text link used for the "Zaten hesabın var mı? Giriş yap" row
 * (mockup `.signin-link`). [prefix] is the muted lead-in and [emphasis] the
 * bolded brand-tinted action word.
 */
@Composable
fun AuroraTextLink(
    prefix: String,
    emphasis: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    dark: Boolean = isSystemInDarkTheme(),
) {
    val muted = if (dark) Color.White.copy(alpha = 0.80f) else Color(0xFF2F4A73)
    val strong = if (dark) Color.White else Color(0xFF0F5EEF)
    TextButton(onClick = onClick, modifier = modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(prefix, color = muted, fontSize = 14.5f.sp)
            Text(emphasis, color = strong, fontSize = 14.5f.sp, fontWeight = FontWeight.Bold)
        }
    }
}
