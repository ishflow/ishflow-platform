package dev.ishflow.android.core.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

/**
 * Centralized haptic feedback idioms shared across the app.
 *
 * - [rememberClickHaptic]: lightweight tap feedback (FAB, pull-to-refresh trigger).
 * - [rememberSuccessHaptic]: confirmation buzz on successful wizard post.
 * - [rememberWarningHaptic]: stronger buzz for warnings / soft errors.
 *
 * All three return a `() -> Unit` so callers can invoke them inline from any
 * lambda without needing a [Composable] scope at the call site itself.
 */
object Haptics {
    @Composable
    fun rememberClickHaptic(): () -> Unit {
        val haptic = LocalHapticFeedback.current
        return remember(haptic) { { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) } }
    }

    @Composable
    fun rememberSuccessHaptic(): () -> Unit {
        val haptic = LocalHapticFeedback.current
        return remember(haptic) { { haptic.performHapticFeedback(HapticFeedbackType.LongPress) } }
    }

    @Composable
    fun rememberWarningHaptic(): () -> Unit {
        val haptic = LocalHapticFeedback.current
        return remember(haptic) { { haptic.performHapticFeedback(HapticFeedbackType.LongPress) } }
    }
}
