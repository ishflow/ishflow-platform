package dev.ishflow.android.feature.purchases

import androidx.lifecycle.SavedStateHandle
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.DocumentCreateResponse
import dev.ishflow.android.appshared.models.DocumentPostResponse
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.core.cache.DetailCache
import dev.ishflow.android.core.pdf.PdfShareService
import dev.ishflow.android.core.ui.AppSnackbarController
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.IOException
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class PurchaseDetailViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    private val now = Instant.EPOCH
    private val fakeDocument = DocumentRecord(
        id = "orig-1",
        number = "PO-001",
        date = now,
        createdAt = now,
        updatedAt = now,
        status = DocumentStatus.DRAFT,
        customer = null,
        supplier = null,
        total = "1000.00",
        items = emptyList(),
        linkedInvoices = emptyList(),
    )

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun buildViewModel(
        api: ApiService,
        documentId: String = "orig-1",
        detailCache: DetailCache = DetailCache(),
    ): PurchaseDetailViewModel {
        val savedStateHandle = SavedStateHandle(mapOf("id" to documentId))
        val pdfShareService = mockk<PdfShareService>(relaxed = true)
        val snackbar = mockk<AppSnackbarController>(relaxed = true)
        return PurchaseDetailViewModel(savedStateHandle, api, pdfShareService, snackbar, detailCache)
    }

    @Test
    fun `retry after failure transitions to loaded`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()

        // First call throws, second call succeeds
        coEvery { api.getDocument(any(), any()) } throws IOException("network error") andThen fakeDocument

        val vm = buildViewModel(api)

        // Initial load fails
        advanceUntilIdle()
        assertTrue(vm.uiState.value is PurchaseDetailUiState.Failed, "Expected Failed after initial error load")

        // Retry — should succeed
        vm.retry()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is PurchaseDetailUiState.Loaded, "Expected Loaded after retry, got $state")
        assertEquals("PO-001", (state as PurchaseDetailUiState.Loaded).document.number)
    }

    @Test
    fun `cloneEmitsNewIdEvent`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val clonedRecord = fakeDocument.copy(id = "new-1", number = "PO-NEW")
        val cloneResponse = DocumentCreateResponse(id = "new-1", record = clonedRecord)

        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns fakeDocument
        coEvery { api.cloneDocument("purchases.invoice", "orig-1", any()) } returns cloneResponse

        val vm = buildViewModel(api)
        advanceUntilIdle() // let init load complete

        val events = mutableListOf<PurchaseDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.clone()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertEquals(PurchaseDetailEvent.ClonedTo("new-1"), events.last())
        job.cancel()
    }

    @Test
    fun `cloneEmitsErrorEventOnFailure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns fakeDocument
        coEvery { api.cloneDocument("purchases.invoice", "orig-1", any()) } throws RuntimeException("network error")

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<PurchaseDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.clone()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertTrue(events.last() is PurchaseDetailEvent.Error)
        job.cancel()
    }

    @Test
    fun `postEmitsPostedEventAndReloadsDocument`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val postedDocument = fakeDocument.copy(status = DocumentStatus.POSTED)
        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns fakeDocument andThen postedDocument
        coEvery { api.postDocument("purchases.invoice", "orig-1") } returns DocumentPostResponse(movementCount = 2)

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<PurchaseDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.post()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertEquals(PurchaseDetailEvent.Posted, events.last())
        val state = vm.uiState.value
        assertTrue(state is PurchaseDetailUiState.Loaded)
        assertEquals(DocumentStatus.POSTED, (state as PurchaseDetailUiState.Loaded).document.status)
        job.cancel()
    }

    @Test
    fun `postEmitsErrorEventOnFailure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns fakeDocument
        coEvery { api.postDocument("purchases.invoice", "orig-1") } throws RuntimeException("post failed")

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<PurchaseDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.post()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertTrue(events.last() is PurchaseDetailEvent.Error)
        job.cancel()
    }

    @Test
    fun `unpostEmitsUnpostedEventAndReloadsDocument`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val postedDocument = fakeDocument.copy(status = DocumentStatus.POSTED)
        val draftDocument = fakeDocument.copy(status = DocumentStatus.DRAFT)
        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns postedDocument andThen draftDocument
        coEvery { api.unpostDocument("purchases.invoice", "orig-1") } returns DocumentPostResponse(movementCount = 2)

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<PurchaseDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.unpost()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertEquals(PurchaseDetailEvent.Unposted, events.last())
        val state = vm.uiState.value
        assertTrue(state is PurchaseDetailUiState.Loaded)
        assertEquals(DocumentStatus.DRAFT, (state as PurchaseDetailUiState.Loaded).document.status)
        job.cancel()
    }

    @Test
    fun `unpostEmitsErrorEventOnFailure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns fakeDocument
        coEvery { api.unpostDocument("purchases.invoice", "orig-1") } throws RuntimeException("unpost failed")

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<PurchaseDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.unpost()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertTrue(events.last() is PurchaseDetailEvent.Error)
        job.cancel()
    }

    @Test
    fun `postInvalidatesCacheAndEmitsLoadedFreshWithoutStaleFlicker`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val draftDoc = fakeDocument.copy(status = DocumentStatus.DRAFT, number = "PO-DRAFT")
        val postedDoc = fakeDocument.copy(status = DocumentStatus.POSTED, number = "PO-POSTED")
        // Pre-warm the cache with the DRAFT version so the initial load uses it,
        // then the post() refresh must invalidate it and skip the warm-start path.
        val cache = DetailCache().also { it.putDocument("orig-1", draftDoc) }

        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns draftDoc andThen postedDoc
        coEvery { api.listAttachments("purchases.invoice", "orig-1") } throws RuntimeException("ignored")
        coEvery { api.postDocument("purchases.invoice", "orig-1") } returns DocumentPostResponse(movementCount = 1)

        val vm = buildViewModel(api, detailCache = cache)
        advanceUntilIdle()
        assertTrue(cache.getDocument("orig-1")?.status == DocumentStatus.DRAFT)

        val states = mutableListOf<PurchaseDetailUiState>()
        val job = launch { vm.uiState.collect { states.add(it) } }

        vm.post()
        advanceUntilIdle()

        // After post(), no Loaded(DRAFT) should appear (the stale flicker).
        val postCallStates = states.drop(1) // drop replay of the pre-post Loaded state
        val staleAppearances = postCallStates.filterIsInstance<PurchaseDetailUiState.Loaded>()
            .filter { it.document.status == DocumentStatus.DRAFT }
        assertEquals(0, staleAppearances.size, "post() should not emit Loaded(DRAFT) after cache invalidation")

        val terminal = vm.uiState.value
        assertTrue(terminal is PurchaseDetailUiState.Loaded)
        assertEquals(DocumentStatus.POSTED, (terminal as PurchaseDetailUiState.Loaded).document.status)
        assertEquals(DocumentStatus.POSTED, cache.getDocument("orig-1")?.status)
        job.cancel()
    }

    @Test
    fun `cacheHitRendersWarmDocImmediatelyAndThenRefreshes`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val cachedDoc = fakeDocument.copy(number = "PO-CACHED")
        val freshDoc = fakeDocument.copy(number = "PO-FRESH")
        val cache = DetailCache().also { it.putDocument("orig-1", cachedDoc) }

        coEvery { api.getDocument("purchases.invoice", "orig-1") } returns freshDoc
        coEvery { api.listAttachments("purchases.invoice", "orig-1") } throws RuntimeException("ignored")

        val vm = buildViewModel(api, detailCache = cache)

        val states = mutableListOf<PurchaseDetailUiState>()
        val job = launch { vm.uiState.collect { states.add(it) } }

        advanceUntilIdle()

        val firstLoaded = states.firstOrNull { it is PurchaseDetailUiState.Loaded } as? PurchaseDetailUiState.Loaded
        assertEquals("PO-CACHED", firstLoaded?.document?.number)
        val last = vm.uiState.value
        assertTrue(last is PurchaseDetailUiState.Loaded)
        assertEquals("PO-FRESH", (last as PurchaseDetailUiState.Loaded).document.number)
        job.cancel()
    }
}
