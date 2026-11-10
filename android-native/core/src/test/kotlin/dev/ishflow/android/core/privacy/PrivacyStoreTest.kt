package dev.ishflow.android.core.privacy

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PrivacyStoreTest {

    @TempDir
    lateinit var tempDir: File

    private lateinit var dataStore: DataStore<Preferences>
    private lateinit var store: PrivacyStore

    @BeforeEach
    fun setUp() {
        dataStore = PreferenceDataStoreFactory.create(
            produceFile = { File(tempDir, "privacy.preferences_pb") },
        )
        store = PrivacyStore(dataStore)
    }

    @AfterEach
    fun tearDown() {
        // PreferenceDataStoreFactory has no public close hook; JVM will release
        // file handles when tempDir is cleaned up by JUnit.
    }

    @Test
    fun `analytics defaults to true`() = runTest {
        assertTrue(store.analyticsEnabled.first())
    }

    @Test
    fun `diagnostics defaults to true`() = runTest {
        assertTrue(store.diagnosticsEnabled.first())
    }

    @Test
    fun `setAnalytics false persists`() = runTest {
        store.setAnalytics(false)
        assertEquals(false, store.analyticsEnabled.first())
    }

    @Test
    fun `setDiagnostics false persists independently`() = runTest {
        store.setDiagnostics(false)
        assertEquals(false, store.diagnosticsEnabled.first())
        // Analytics is independent and stays at default.
        assertTrue(store.analyticsEnabled.first())
    }

    @Test
    fun `setAnalytics toggles back to true`() = runTest {
        store.setAnalytics(false)
        store.setAnalytics(true)
        assertTrue(store.analyticsEnabled.first())
    }
}
