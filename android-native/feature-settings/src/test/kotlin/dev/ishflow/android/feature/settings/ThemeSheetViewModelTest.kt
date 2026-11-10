package dev.ishflow.android.feature.settings

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import app.cash.turbine.test
import dev.ishflow.android.theme.ThemeMode
import dev.ishflow.android.theme.ThemeModeStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals

/**
 * Exercises [ThemeSheetViewModel] against a real [ThemeModeStore] backed by a
 * tempfile-rooted preferences DataStore. We use the store's testing
 * constructor (raw [androidx.datastore.core.DataStore]) so we don't need an
 * Android `Context` or Robolectric on the JVM classpath.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ThemeSheetViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private val dataStoreScope = CoroutineScope(SupervisorJob() + UnconfinedTestDispatcher())

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        dataStoreScope.cancel()
        Dispatchers.resetMain()
    }

    @Test
    fun `picking LIGHT writes LIGHT through to the store flow`(@TempDir tempDir: File) =
        runTest(testDispatcher) {
            val vm = ThemeSheetViewModel(buildStore(tempDir))

            vm.mode.test {
                assertEquals(ThemeMode.SYSTEM, awaitItem())
                vm.pick(ThemeMode.LIGHT)
                advanceUntilIdle()
                assertEquals(ThemeMode.LIGHT, awaitItem())
                cancelAndConsumeRemainingEvents()
            }
        }

    @Test
    fun `picking DARK then SYSTEM flows both values through`(@TempDir tempDir: File) =
        runTest(testDispatcher) {
            val vm = ThemeSheetViewModel(buildStore(tempDir))

            vm.mode.test {
                assertEquals(ThemeMode.SYSTEM, awaitItem())
                vm.pick(ThemeMode.DARK)
                advanceUntilIdle()
                assertEquals(ThemeMode.DARK, awaitItem())
                vm.pick(ThemeMode.SYSTEM)
                advanceUntilIdle()
                assertEquals(ThemeMode.SYSTEM, awaitItem())
                cancelAndConsumeRemainingEvents()
            }
        }

    private fun buildStore(tempDir: File): ThemeModeStore {
        val ds = PreferenceDataStoreFactory.create(scope = dataStoreScope) {
            File(tempDir, "theme_mode.preferences_pb")
        }
        return ThemeModeStore(ds)
    }
}
