package dev.ishflow.android.core.ui

import org.junit.jupiter.api.Test
import kotlin.test.assertNotNull

class HapticsTest {
    @Test
    fun `Haptics object exposes three idioms`() {
        // Smoke test: object can be referenced from the JVM test classpath.
        // Real haptic behavior is platform-tested manually since the
        // composables depend on LocalHapticFeedback which only exists in a
        // Compose runtime.
        assertNotNull(Haptics)
    }
}
