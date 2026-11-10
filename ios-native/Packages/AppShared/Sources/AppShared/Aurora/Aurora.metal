#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>

using namespace metal;

// Aurora background — full-fidelity port of the "flow" (Akış / brand-blue) mode
// from the approved onboarding-aurora-v2 mockup. The "growth" mode is out of
// scope. Brand colours: #0F5EEF (blue) and #B0E9FD (cyan highlight).

static float3 mod289(float3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
static float2 mod289(float2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
static float3 permute(float3 x) { return mod289(((x * 34.0) + 1.0) * x); }

// 2D simplex noise (Ashima / Gustavson), matching the GLSL in the mockup.
// The mod289 / permute / snoise helpers derive from the MIT-licensed "webgl-noise"
// by Ashima Arts and Stefan Gustavson (Copyright (C) 2011 Ashima Arts).
static float snoise(float2 v) {
    const float4 C = float4(0.211324865405187, 0.366025403784439,
                            -0.577350269189626, 0.024390243902439);
    float2 i = floor(v + dot(v, C.yy));
    float2 x0 = v - i + dot(i, C.xx);
    float2 i1 = (x0.x > x0.y) ? float2(1.0, 0.0) : float2(0.0, 1.0);
    float4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    float3 p = permute(permute(i.y + float3(0.0, i1.y, 1.0)) + i.x + float3(0.0, i1.x, 1.0));
    float3 m = max(0.5 - float3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
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

static float fbm(float2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * snoise(p);
        p = p * 2.0 + float2(1.7, 9.2);
        a *= 0.5;
    }
    return s;
}

static float3 flow(float2 uv, float uTime, float uDark, float2 uRes) {
    float asp = uRes.x / uRes.y;
    float2 p = float2(uv.x * asp, uv.y) * 1.7;
    float t = uTime * 0.045;
    float2 q = float2(fbm(p + float2(0.0, t)), fbm(p + float2(3.2, 1.3) - t));
    float f = fbm(p + 1.6 * q);
    float n = clamp(f * 0.5 + 0.5, 0.0, 1.0);
    float g = smoothstep(0.25, 1.0, n);
    float3 blue = float3(0.059, 0.369, 0.937);    // #0F5EEF
    float3 lite = float3(0.690, 0.914, 0.992);    // #B0E9FD
    float3 col;
    if (uDark > 0.5) {
        float3 base = float3(0.02, 0.03, 0.06);
        float3 deep = float3(0.04, 0.10, 0.30);
        col = base;
        col += blue * pow(g, 1.5) * 0.95;
        col += deep * pow(clamp(1.0 - n, 0.0, 1.0), 1.4) * 0.5;
        col += lite * pow(n, 3.2) * 0.22;
    } else {
        float3 base = float3(0.957, 0.965, 0.98);
        col = base;
        col = mix(col, blue, pow(g, 1.7) * 0.42);
        col = mix(col, lite, clamp(1.0 - n, 0.0, 1.0) * 0.45);
    }
    return col;
}

// Stitchable SwiftUI shader. `position` is in pixels; `size` is the fill size in
// pixels. Returns an opaque colour sampled from the aurora flow field.
[[ stitchable ]] half4 aurora(float2 position, float time, float dark, float2 size) {
    float2 uv = position / size;
    float3 c = flow(uv, time, dark, size);
    return half4(half3(c), 1.0h);
}
