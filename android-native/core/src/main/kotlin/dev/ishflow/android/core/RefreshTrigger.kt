package dev.ishflow.android.core

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

fun interface Clock {
    fun nowMillis(): Long
}

@Singleton
class RefreshTrigger @Inject constructor(private val clock: Clock = Clock { System.currentTimeMillis() }) {
    private val _events = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val events: SharedFlow<Unit> = _events.asSharedFlow()
    private var lastFireMillis: Long = 0L
    private var hasFired: Boolean = false

    @Synchronized
    fun fire(minIntervalMillis: Long = 30_000L) {
        val now = clock.nowMillis()
        if (hasFired && now - lastFireMillis < minIntervalMillis) return
        hasFired = true
        lastFireMillis = now
        _events.tryEmit(Unit)
    }
}
