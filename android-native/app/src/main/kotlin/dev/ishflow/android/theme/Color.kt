package dev.ishflow.android.theme

import androidx.compose.ui.graphics.Color

// Brand palette
internal val BrandPrimary = Color(0xFF0F5EEF)
internal val BrandSecondary = Color(0xFFB0E9FD)
internal val BrandBlack = Color(0xFF000000)
internal val BrandOffWhite = Color(0xFFF4F4F4)
internal val BrandWhite = Color(0xFFFFFFFF)

// Derived subtle shades — keep Material 3 token relationships sane
// without inventing new brand hues.
private val BrandPrimaryContainer = Color(0xFFD7E6FF) // soft blue tint for light scheme containers
private val BrandOnPrimaryContainer = Color(0xFF001A4D) // deep navy for legible text on the container
private val BrandOnSecondary = Color(0xFF001E2E) // near-black for legibility on BrandSecondary
private val BrandSurfaceVariantLight = Color(0xFFE5E5E5)
private val BrandOnSurfaceVariantLight = Color(0xFF424242)
private val BrandSurfaceVariantDark = Color(0xFF1A1A1A)
private val BrandOnSurfaceVariantDark = Color(0xFFCFCFCF)
private val BrandOutlineLight = Color(0xFFBFBFBF)
private val BrandOutlineDark = Color(0xFF5C5C5C)

// Brand has no tertiary hue — alias `tertiary*` to the secondary
// (BrandSecondary light-blue) family so any Material component that
// reaches for tertiary by default (FAB, NavigationRail indicator, etc.)
// stays on-palette instead of leaking Material's default lavender/pink.
private val BrandTertiaryLight = BrandSecondary
private val BrandOnTertiaryLight = BrandOnSecondary
private val BrandTertiaryContainerLight = BrandSecondary
private val BrandOnTertiaryContainerLight = BrandOnSecondary
private val BrandTertiaryDark = BrandSecondary
private val BrandOnTertiaryDark = BrandOnSecondary
private val BrandTertiaryContainerDark = Color(0xFF003B52)
private val BrandOnTertiaryContainerDark = BrandSecondary

// Surface-container tonal family — Material 3 expects a graduated set
// from `surfaceContainerLowest` (closest to background) to
// `surfaceContainerHighest` (furthest from background, most elevated).
// Stay on the BrandOffWhite → light-gray axis in light mode and the
// BrandBlack → dark-gray axis in dark mode.
private val BrandSurfaceContainerLowestLight = BrandWhite
private val BrandSurfaceContainerLowLight = Color(0xFFFAFAFA)
private val BrandSurfaceContainerLight = BrandOffWhite
private val BrandSurfaceContainerHighLight = Color(0xFFEDEDED)
private val BrandSurfaceContainerHighestLight = Color(0xFFE5E5E5)
private val BrandSurfaceContainerLowestDark = Color(0xFF050505)
private val BrandSurfaceContainerLowDark = Color(0xFF121212)
private val BrandSurfaceContainerDark = Color(0xFF181818)
private val BrandSurfaceContainerHighDark = Color(0xFF1F1F1F)
private val BrandSurfaceContainerHighestDark = Color(0xFF262626)

// Outline-variant — subtler than `outline`, used for hairlines.
private val BrandOutlineVariantLight = Color(0xFFE0E0E0)
private val BrandOutlineVariantDark = Color(0xFF3A3A3A)

// Inverse tokens (snackbars, tooltips) — flip between black/off-white.
private val BrandInverseSurfaceLight = BrandBlack
private val BrandInverseOnSurfaceLight = BrandOffWhite
private val BrandInverseSurfaceDark = BrandOffWhite
private val BrandInverseOnSurfaceDark = BrandBlack
private val BrandInversePrimary = Color(0xFF9CC3FF) // lighter blue for inverse contexts

// Light scheme tokens
internal val LightPrimary = BrandPrimary
internal val LightOnPrimary = BrandWhite
internal val LightPrimaryContainer = BrandPrimaryContainer
internal val LightOnPrimaryContainer = BrandOnPrimaryContainer
internal val LightSecondary = BrandSecondary
internal val LightOnSecondary = BrandOnSecondary
internal val LightSecondaryContainer = BrandSecondary
internal val LightOnSecondaryContainer = BrandOnSecondary
internal val LightBackground = BrandOffWhite
internal val LightOnBackground = BrandBlack
internal val LightSurface = BrandOffWhite
internal val LightOnSurface = BrandBlack
internal val LightSurfaceVariant = BrandSurfaceVariantLight
internal val LightOnSurfaceVariant = BrandOnSurfaceVariantLight
internal val LightOutline = BrandOutlineLight
internal val LightOutlineVariant = BrandOutlineVariantLight
internal val LightTertiary = BrandTertiaryLight
internal val LightOnTertiary = BrandOnTertiaryLight
internal val LightTertiaryContainer = BrandTertiaryContainerLight
internal val LightOnTertiaryContainer = BrandOnTertiaryContainerLight
internal val LightSurfaceContainerLowest = BrandSurfaceContainerLowestLight
internal val LightSurfaceContainerLow = BrandSurfaceContainerLowLight
internal val LightSurfaceContainer = BrandSurfaceContainerLight
internal val LightSurfaceContainerHigh = BrandSurfaceContainerHighLight
internal val LightSurfaceContainerHighest = BrandSurfaceContainerHighestLight
internal val LightInverseSurface = BrandInverseSurfaceLight
internal val LightInverseOnSurface = BrandInverseOnSurfaceLight
internal val LightInversePrimary = BrandInversePrimary

// Dark scheme tokens
internal val DarkPrimary = BrandPrimary
internal val DarkOnPrimary = BrandWhite
internal val DarkPrimaryContainer = Color(0xFF002F8A)
internal val DarkOnPrimaryContainer = Color(0xFFD7E6FF)
internal val DarkSecondary = BrandSecondary
internal val DarkOnSecondary = BrandOnSecondary
internal val DarkSecondaryContainer = Color(0xFF003B52)
internal val DarkOnSecondaryContainer = BrandSecondary
internal val DarkBackground = BrandBlack
internal val DarkOnBackground = BrandOffWhite
internal val DarkSurface = BrandBlack
internal val DarkOnSurface = BrandOffWhite
internal val DarkSurfaceVariant = BrandSurfaceVariantDark
internal val DarkOnSurfaceVariant = BrandOnSurfaceVariantDark
internal val DarkOutline = BrandOutlineDark
internal val DarkOutlineVariant = BrandOutlineVariantDark
internal val DarkTertiary = BrandTertiaryDark
internal val DarkOnTertiary = BrandOnTertiaryDark
internal val DarkTertiaryContainer = BrandTertiaryContainerDark
internal val DarkOnTertiaryContainer = BrandOnTertiaryContainerDark
internal val DarkSurfaceContainerLowest = BrandSurfaceContainerLowestDark
internal val DarkSurfaceContainerLow = BrandSurfaceContainerLowDark
internal val DarkSurfaceContainer = BrandSurfaceContainerDark
internal val DarkSurfaceContainerHigh = BrandSurfaceContainerHighDark
internal val DarkSurfaceContainerHighest = BrandSurfaceContainerHighestDark
internal val DarkInverseSurface = BrandInverseSurfaceDark
internal val DarkInverseOnSurface = BrandInverseOnSurfaceDark
internal val DarkInversePrimary = BrandInversePrimary
