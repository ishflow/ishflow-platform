package dev.ishflow.android.theme

/**
 * User-facing theme preference. `SYSTEM` defers to the OS dark-mode flag;
 * `LIGHT` / `DARK` are explicit overrides.
 *
 * The store persists the [name] of the enum (see [ThemeModeStore]) so we
 * can fall back to `SYSTEM` if the stored value ever stops matching a
 * known case (e.g. after a rename refactor on an older build).
 */
enum class ThemeMode { SYSTEM, LIGHT, DARK }
