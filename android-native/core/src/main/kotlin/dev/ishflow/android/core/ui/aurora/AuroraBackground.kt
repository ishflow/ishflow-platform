package dev.ishflow.android.core.ui.aurora

import android.graphics.RuntimeShader
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import androidx.compose.runtime.withFrameNanos

/**
 * Full-bleed animated "Aurora" background used behind every onboarding
 * screen. Ports the `flow()` mode of the brand mockup
 * (`ios-native/redesign-html/onboarding-aurora-v2.html`) to AGSL so the
 * exact GLSL fbm flow renders identically on Android.
 *
 * minSdk is 34 so [RuntimeShader] (API 33+) is always available; the
 * try/catch around shader construction is a belt-and-braces guard for OEM
 * GPU drivers that reject AGSL at runtime. When the shader cannot be built
 * or fails, we fall back to a static brand [Brush.linearGradient] so the
 * background never renders blank/black.
 *
 * Place content on top by passing it as [content]; the background fills the
 * whole [Box].
 */
@Composable
fun AuroraBackground(
    modifier: Modifier = Modifier,
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    // Build the RuntimeShader once. Any failure → null → gradient fallback.
    val shader = remember {
        runCatching { RuntimeShader(AURORA_AGSL) }.getOrNull()
    }

    if (shader == null) {
        FallbackGradientBackground(modifier = modifier, dark = dark, content = content)
        return
    }

    var size by remember { mutableStateOf(IntSize.Zero) }
    var timeSeconds by remember { mutableFloatStateOf(0f) }

    // Frame clock — advances uTime in seconds every frame while composed.
    LaunchedEffect(Unit) {
        val start = withFrameNanos { it }
        while (true) {
            withFrameNanos { now ->
                timeSeconds = (now - start) / 1_000_000_000f
            }
        }
    }

    val brush = remember(shader) { ShaderBrush(shader) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .onSizeChanged { size = it }
            .drawBehind {
                if (size.width <= 0 || size.height <= 0) return@drawBehind
                // Guard the whole shader update+draw; if a driver throws we
                // paint a solid brand-tinted base rather than crashing.
                val drewShader = runCatching {
                    shader.setFloatUniform("uTime", timeSeconds)
                    shader.setFloatUniform("uDark", if (dark) 1f else 0f)
                    shader.setFloatUniform(
                        "uRes",
                        size.width.toFloat(),
                        size.height.toFloat(),
                    )
                    drawRect(brush = brush)
                    true
                }.getOrDefault(false)
                if (!drewShader) {
                    drawRect(brush = fallbackBrush(dark, Offset(0f, 0f), Offset(size.width.toFloat(), size.height.toFloat())))
                }
            },
    ) {
        content()
    }
}

@Composable
private fun FallbackGradientBackground(
    modifier: Modifier,
    dark: Boolean,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                if (dark) {
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF07121F),
                            Color(0xFF0F5EEF),
                            Color(0xFF0A1A33),
                        ),
                    )
                } else {
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFFF4F6FA),
                            Color(0xFFB0E9FD),
                            Color(0xFF0F5EEF),
                        ),
                    )
                },
            ),
    ) {
        content()
    }
}

private fun fallbackBrush(dark: Boolean, start: Offset, end: Offset): Brush =
    if (dark) {
        Brush.linearGradient(
            colors = listOf(Color(0xFF07121F), Color(0xFF0F5EEF), Color(0xFF0A1A33)),
            start = start,
            end = end,
        )
    } else {
        Brush.linearGradient(
            colors = listOf(Color(0xFFF4F6FA), Color(0xFFB0E9FD), Color(0xFF0F5EEF)),
            start = start,
            end = end,
        )
    }

/**
 * AGSL port of the mockup's `flow()` shader. AGSL entry point is
 * `half4 main(float2 fragCoord)`. uv = fragCoord / uRes; uTime in seconds;
 * uDark 0/1. Simplex noise + 4-octave fbm reproduced from the GLSL source.
 */
private const val AURORA_AGSL = """
uniform float uTime;
uniform float uDark;
uniform float2 uRes;

float3 mod289_3(float3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float2 mod289_2(float2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float3 permute(float3 x) { return mod289_3(((x * 34.0) + 1.0) * x); }

float snoise(float2 v) {
  const float4 C = float4(0.211324865405187, 0.366025403784439,
                          -0.577350269189626, 0.024390243902439);
  float2 i = floor(v + dot(v, C.yy));
  float2 x0 = v - i + dot(i, C.xx);
  float2 i1 = (x0.x > x0.y) ? float2(1.0, 0.0) : float2(0.0, 1.0);
  float4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289_2(i);
  float3 p = permute(permute(i.y + float3(0.0, i1.y, 1.0))
                     + i.x + float3(0.0, i1.x, 1.0));
  float3 m = max(0.5 - float3(dot(x0, x0), dot(x12.xy, x12.xy),
                              dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  float3 x = 2.0 * fract(p * C.www) - 1.0;
  float3 h = abs(x) - 0.5;
  float3 ox = floor(x + 0.5);
  float3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  float3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(float2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * snoise(p);
    p = p * 2.0 + float2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / uRes;
  float asp = uRes.x / uRes.y;
  float2 p = float2(uv.x * asp, uv.y) * 1.7;
  float t = uTime * 0.045;
  float2 q = float2(fbm(p + float2(0.0, t)), fbm(p + float2(3.2, 1.3) - t));
  float f = fbm(p + 1.6 * q);
  float n = clamp(f * 0.5 + 0.5, 0.0, 1.0);
  float g = smoothstep(0.25, 1.0, n);
  half3 blue = half3(0.059, 0.369, 0.937);
  half3 lite = half3(0.690, 0.914, 0.992);
  half3 col;
  if (uDark > 0.5) {
    half3 base = half3(0.02, 0.03, 0.06);
    half3 deep = half3(0.04, 0.10, 0.30);
    col = base;
    col += blue * pow(g, 1.5) * 0.95;
    col += deep * pow(clamp(1.0 - n, 0.0, 1.0), 1.4) * 0.5;
    col += lite * pow(n, 3.2) * 0.22;
  } else {
    half3 base = half3(0.957, 0.965, 0.98);
    col = base;
    col = mix(col, blue, pow(g, 1.7) * 0.42);
    col = mix(col, lite, clamp(1.0 - n, 0.0, 1.0) * 0.45);
  }
  return half4(col, 1.0);
}
"""
