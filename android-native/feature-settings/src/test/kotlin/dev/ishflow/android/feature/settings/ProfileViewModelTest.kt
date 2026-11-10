package dev.ishflow.android.feature.settings

import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.api.ApiException
import dev.ishflow.android.appshared.models.CatalogCreateProductRequest
import dev.ishflow.android.appshared.models.CatalogCreateRequest
import dev.ishflow.android.appshared.models.CatalogCreateResponse
import dev.ishflow.android.appshared.models.CatalogListResponse
import dev.ishflow.android.appshared.models.CounterpartyListResponse
import dev.ishflow.android.appshared.models.CreateWorkspaceRequest
import dev.ishflow.android.appshared.models.CreateWorkspaceResponse
import dev.ishflow.android.appshared.models.DocumentCreateResponse
import dev.ishflow.android.appshared.models.DocumentListResponse
import dev.ishflow.android.appshared.models.DocumentPostResponse
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.PaymentReceivedCreate
import dev.ishflow.android.appshared.models.PaymentSentCreate
import dev.ishflow.android.appshared.models.ProductPricesResponse
import dev.ishflow.android.appshared.models.PurchaseInvoiceCreate
import dev.ishflow.android.appshared.models.PushRegisterRequest
import dev.ishflow.android.appshared.models.PushUnregisterRequest
import dev.ishflow.android.appshared.models.RegisterBalanceResponse
import dev.ishflow.android.appshared.models.SeedDemoRequest
import dev.ishflow.android.appshared.models.SeedDemoResponse
import dev.ishflow.android.appshared.models.SwitchTenantResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.JsonElement
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import retrofit2.HttpException
import retrofit2.Response
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class ProfileViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `401 from getMe surfaces ApiException Http(401) in Failed state`() = runTest(testDispatcher) {
        val api = object : ApiService {
            override suspend fun getMe(): MeResponse = throw HttpException(
                Response.error<Any>(
                    401,
                    "{\"error\":\"unauthorized\"}".toResponseBody("application/json".toMediaType()),
                ),
            )
            override suspend fun listDocuments(
                type: String,
                page: Int,
                pageSize: Int,
                query: String?,
                status: String?,
            ) = error("unused")
            override suspend fun getDocument(type: String, id: String) = error("unused")
            override suspend fun createDocument(type: String, body: JsonElement): DocumentCreateResponse =
                error("unused")
            override suspend fun postDocument(type: String, id: String): DocumentPostResponse = error("unused")
            override suspend fun unpostDocument(type: String, id: String): DocumentPostResponse = error("unused")
            override suspend fun getDocumentPdf(type: String, id: String) = error("unused")
            override suspend fun listCatalog(
                entity: String,
                query: String?,
                page: Int,
                pageSize: Int,
            ): CatalogListResponse = error("unused")
            override suspend fun createCatalogRecord(
                entity: String,
                idempotencyKey: String,
                body: CatalogCreateRequest,
            ): CatalogCreateResponse = error("unused")
            override suspend fun createCatalogProduct(
                entity: String,
                idempotencyKey: String,
                body: CatalogCreateProductRequest,
            ): CatalogCreateResponse = error("unused")
            override suspend fun registerBalance(slug: String, groupBy: String?): RegisterBalanceResponse =
                error("unused")
            override suspend fun registerPush(request: PushRegisterRequest) = error("unused")
            override suspend fun unregisterPush(request: PushUnregisterRequest) = error("unused")
            override suspend fun switchTenant(tenantId: String): SwitchTenantResponse = error("unused")
            override suspend fun createWorkspace(request: CreateWorkspaceRequest): CreateWorkspaceResponse =
                error("unused")
            override suspend fun seedDemoData(request: SeedDemoRequest): SeedDemoResponse = error("unused")
            override suspend fun listCounterparties(
                type: String?,
                query: String?,
                page: Int,
                pageSize: Int,
            ): CounterpartyListResponse = error("unused")
            override suspend fun createPaymentReceived(
                idempotencyKey: String,
                body: PaymentReceivedCreate,
            ): DocumentCreateResponse = error("unused")
            override suspend fun createPurchaseInvoice(
                idempotencyKey: String,
                body: PurchaseInvoiceCreate,
            ): DocumentCreateResponse = error("unused")
            override suspend fun createPaymentSent(
                idempotencyKey: String,
                body: PaymentSentCreate,
            ): DocumentCreateResponse = error("unused")
            override suspend fun getCounterparty360(id: String, type: String) = error("unused")
            override suspend fun getOpenInvoices(
                counterpartyId: String,
                direction: String,
            ) = error("unused")
            override suspend fun getProductPrices(
                productId: String,
            ): ProductPricesResponse = error("unused")
            override suspend fun exportReportXlsx(type: String, from: String?, to: String?) = error("unused")
            override suspend fun salesSummary(from: String, to: String) = error("unused")
            override suspend fun arAging() = error("unused")
            override suspend fun grossProfit(from: String, to: String) = error("unused")
            override suspend fun getStockMovements(
                productId: String,
                warehouseId: String?,
                limit: Int?,
            ) = error("unused")
            override suspend fun getStockBalancesByProduct(
                groupBy: String,
                product: String,
            ) = error("unused")
            override suspend fun uploadAttachmentSign(body: dev.ishflow.android.appshared.models.AttachmentUploadRequest) = error("unused")
            override suspend fun listAttachments(kind: String, id: String) = error("unused")
            override suspend fun deleteAttachment(id: String) = error("unused")
            override suspend fun cloneDocument(kind: String, id: String, idempotencyKey: String) = error("unused")
            override suspend fun getDashboardLayout() = error("unused")
            override suspend fun getBilling() = error("unused")
            override suspend fun createBillingPortalSession() = error("unused")
            override suspend fun deleteAccount() = error("unused")
        }

        val vm = ProfileViewModel(api)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ProfileUiState.Failed)
        val ex = state.exception
        assertTrue(ex is ApiException.Http)
        assertEquals(401, ex.status)
    }
}
