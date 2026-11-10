package dev.ishflow.android.feature.sales

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
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class SalesDetailViewModelTest {
    private val testDispatcher = StandardTestDispatcher()

    private val now = Instant.now()
    private val fakeDocument = DocumentRecord(
        id = "orig-1",
        number = "SI-001",
        date = now,
        createdAt = now,
        updatedAt = now,
        status = DocumentStatus.DRAFT,
        customer = null,
        supplier = null,
        total = "1000",
        items = emptyList(),
        linkedInvoices = emptyList(),
    )

    @BeforeEach
    fun setup() {
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
    ): SalesDetailViewModel {
        val savedStateHandle = SavedStateHandle(mapOf("id" to documentId))
        val pdfShareService = mockk<PdfShareService>(relaxed = true)
        val snackbar = mockk<AppSnackbarController>(relaxed = true)
        return SalesDetailViewModel(savedStateHandle, api, pdfShareService, snackbar, detailCache)
    }

    @Test
    fun `cloneEmitsNewIdEvent`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val clonedRecord = fakeDocument.copy(id = "new-1", number = "SI-NEW")
        val cloneResponse = DocumentCreateResponse(id = "new-1", record = clonedRecord)

        coEvery { api.getDocument("sales.invoice", "orig-1") } returns fakeDocument
        coEvery { api.cloneDocument("sales.invoice", "orig-1", any()) } returns cloneResponse

        val vm = buildViewModel(api)
        advanceUntilIdle() // let init load complete

        val events = mutableListOf<SalesDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.clone()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertEquals(SalesDetailEvent.ClonedTo("new-1"), events.last())
        job.cancel()
    }

    @Test
    fun `cloneEmitsErrorEventOnFailure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getDocument("sales.invoice", "orig-1") } returns fakeDocument
        coEvery { api.cloneDocument("sales.invoice", "orig-1", any()) } throws RuntimeException("network error")

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<SalesDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.clone()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assert(events.last() is SalesDetailEvent.Error)
        job.cancel()
    }

    @Test
    fun `postEmitsPostedEventAndReloadsDocument`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val postedDocument = fakeDocument.copy(status = DocumentStatus.POSTED)
        coEvery { api.getDocument("sales.invoice", "orig-1") } returns fakeDocument andThen postedDocument
        coEvery { api.postDocument("sales.invoice", "orig-1") } returns DocumentPostResponse(movementCount = 3)

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<SalesDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.post()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertEquals(SalesDetailEvent.Posted, events.last())
        val state = vm.uiState.value
        assert(state is SalesDetailUiState.Loaded)
        assertEquals(DocumentStatus.POSTED, (state as SalesDetailUiState.Loaded).document.status)
        job.cancel()
    }

    @Test
    fun `postEmitsErrorEventOnFailure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getDocument("sales.invoice", "orig-1") } returns fakeDocument
        coEvery { api.postDocument("sales.invoice", "orig-1") } throws RuntimeException("post failed")

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<SalesDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.post()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assert(events.last() is SalesDetailEvent.Error)
        job.cancel()
    }

    @Test
    fun `unpostEmitsUnpostedEventAndReloadsDocument`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val postedDocument = fakeDocument.copy(status = DocumentStatus.POSTED)
        val draftDocument = fakeDocument.copy(status = DocumentStatus.DRAFT)
        coEvery { api.getDocument("sales.invoice", "orig-1") } returns postedDocument andThen draftDocument
        coEvery { api.unpostDocument("sales.invoice", "orig-1") } returns DocumentPostResponse(movementCount = 3)

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<SalesDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.unpost()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertEquals(SalesDetailEvent.Unposted, events.last())
        val state = vm.uiState.value
        assert(state is SalesDetailUiState.Loaded)
        assertEquals(DocumentStatus.DRAFT, (state as SalesDetailUiState.Loaded).document.status)
        job.cancel()
    }

    @Test
    fun `unpostEmitsErrorEventOnFailure`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        coEvery { api.getDocument("sales.invoice", "orig-1") } returns fakeDocument
        coEvery { api.unpostDocument("sales.invoice", "orig-1") } throws RuntimeException("unpost failed")

        val vm = buildViewModel(api)
        advanceUntilIdle()

        val events = mutableListOf<SalesDetailEvent>()
        val job = launch { vm.events.collect { events.add(it) } }

        vm.unpost()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assert(events.last() is SalesDetailEvent.Error)
        job.cancel()
    }

    @Test
    fun `postInvalidatesCacheAndEmitsLoadedFreshWithoutStaleFlicker`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val draftDoc = fakeDocument.copy(status = DocumentStatus.DRAFT, number = "SI-DRAFT")
        val postedDoc = fakeDocument.copy(status = DocumentStatus.POSTED, number = "SI-POSTED")
        // Pre-warm the cache with the DRAFT version so the initial load uses it,
        // then the post() refresh must invalidate it and skip the warm-start path.
        val cache = DetailCache().also { it.putDocument("orig-1", draftDoc) }

        coEvery { api.getDocument("sales.invoice", "orig-1") } returns draftDoc andThen postedDoc
        coEvery { api.listAttachments("sales.invoice", "orig-1") } throws RuntimeException("ignored")
        coEvery { api.postDocument("sales.invoice", "orig-1") } returns DocumentPostResponse(movementCount = 1)

        val vm = buildViewModel(api, detailCache = cache)
        advanceUntilIdle() // let init load complete — cache now also has DRAFT
        // Sanity: warm cache should be populated.
        assert(cache.getDocument("orig-1")?.status == DocumentStatus.DRAFT)

        val states = mutableListOf<SalesDetailUiState>()
        val job = launch { vm.uiState.collect { states.add(it) } }

        vm.post()
        advanceUntilIdle()

        // After post(), no Loaded(DRAFT) should appear (the stale flicker).
        // States captured from this point may include Loading + Loaded(POSTED).
        val postCallStates = states.drop(1) // drop replay of the pre-post Loaded state
        val staleAppearances = postCallStates.filterIsInstance<SalesDetailUiState.Loaded>()
            .filter { it.document.status == DocumentStatus.DRAFT }
        assertEquals(0, staleAppearances.size, "post() should not emit Loaded(DRAFT) after cache invalidation")

        val terminal = vm.uiState.value
        assert(terminal is SalesDetailUiState.Loaded)
        assertEquals(DocumentStatus.POSTED, (terminal as SalesDetailUiState.Loaded).document.status)
        // Cache should now hold the fresh POSTED record.
        assertEquals(DocumentStatus.POSTED, cache.getDocument("orig-1")?.status)
        job.cancel()
    }

    @Test
    fun `cacheHitRendersWarmDocImmediatelyAndThenRefreshes`() = runTest(testDispatcher) {
        val api = mockk<ApiService>()
        val cachedDoc = fakeDocument.copy(number = "SI-CACHED")
        val freshDoc = fakeDocument.copy(number = "SI-FRESH")
        val cache = DetailCache().also { it.putDocument("orig-1", cachedDoc) }

        coEvery { api.getDocument("sales.invoice", "orig-1") } returns freshDoc
        coEvery { api.listAttachments("sales.invoice", "orig-1") } throws RuntimeException("ignored")

        val vm = buildViewModel(api, detailCache = cache)

        // Collect every emitted state so we can verify the warm-then-fresh
        // sequence rather than only the terminal state.
        val states = mutableListOf<SalesDetailUiState>()
        val job = launch { vm.uiState.collect { states.add(it) } }

        advanceUntilIdle()

        // First non-loading emission must be the cached doc (warm content),
        // and the final emission must be the freshly fetched doc.
        val firstLoaded = states.firstOrNull { it is SalesDetailUiState.Loaded } as? SalesDetailUiState.Loaded
        assertEquals("SI-CACHED", firstLoaded?.document?.number)
        val last = vm.uiState.value
        assert(last is SalesDetailUiState.Loaded)
        assertEquals("SI-FRESH", (last as SalesDetailUiState.Loaded).document.number)
        job.cancel()
    }
}
