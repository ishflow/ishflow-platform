package dev.ishflow.android.core.store

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class DashboardPreferencesTest {

    @TempDir
    lateinit var tempDir: File

    private lateinit var dataStore: DataStore<Preferences>
    private lateinit var prefs: DashboardPreferences

    @BeforeEach
    fun setUp() {
        dataStore = PreferenceDataStoreFactory.create(
            produceFile = { File(tempDir, "dashboard_prefs.preferences_pb") },
        )
        prefs = DashboardPreferences(dataStore)
    }

    @Test
    fun `setupProgressDismissed defaults to false`() = runTest {
        assertFalse(prefs.setupProgressDismissed.first())
    }

    @Test
    fun `setSetupProgressDismissed true persists`() = runTest {
        prefs.setSetupProgressDismissed(true)
        assertTrue(prefs.setupProgressDismissed.first())
    }

    @Test
    fun `setSetupProgressDismissed toggles back to false`() = runTest {
        prefs.setSetupProgressDismissed(true)
        prefs.setSetupProgressDismissed(false)
        assertFalse(prefs.setupProgressDismissed.first())
    }
}
