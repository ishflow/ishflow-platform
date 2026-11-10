package dev.ishflow.android.core.db

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CatalogRecordDaoTest {
    private lateinit var db: IshflowDatabase
    private lateinit var dao: CatalogRecordDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            IshflowDatabase::class.java,
        ).allowMainThreadQueries().build()
        dao = db.catalogRecordDao()
    }

    @After
    fun tearDown() = db.close()

    @Test
    fun upsertAndObserve() = runTest {
        dao.upsertAll(listOf(CatalogRecordEntity("t1", "products", "p1", "Pen", "{}", 100L)))
        val rows = dao.observe("t1", "products").first()
        assertEquals(1, rows.size)
        assertEquals("Pen", rows[0].displayName)
    }
}
