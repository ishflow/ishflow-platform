package dev.ishflow.android.core

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

@OptIn(ExperimentalCoroutinesApi::class)
class RefreshTriggerTest {

    @Test
    fun `fire respects 30s debounce`() = runTest {
        val clock = mutableClock(0L)
        val trigger = RefreshTrigger(clock)
        val received = mutableListOf<Unit>()
        val job = launch { trigger.events.collect { received += it } }
        advanceUntilIdle()

        trigger.fire()
        advanceUntilIdle()
        clock.advanceBy(15_000)
        trigger.fire()
        advanceUntilIdle()
        clock.advanceBy(20_000)
        trigger.fire()
        advanceUntilIdle() // total 35s

        assertEquals(2, received.size)
        job.cancel()
    }
}

private fun mutableClock(initial: Long): MutableClock = MutableClock(initial)

private class MutableClock(private var time: Long) : Clock {
    override fun nowMillis(): Long = time
    fun advanceBy(millis: Long) {
        time += millis
    }
}
