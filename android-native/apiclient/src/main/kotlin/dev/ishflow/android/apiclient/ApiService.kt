package dev.ishflow.android.apiclient

import dev.ishflow.android.appshared.models.ArAging
import dev.ishflow.android.appshared.models.BillingPortalResponse
import dev.ishflow.android.appshared.models.BillingResponse
import dev.ishflow.android.appshared.models.CatalogCreateProductRequest
import dev.ishflow.android.appshared.models.CatalogCreateRequest
import dev.ishflow.android.appshared.models.CatalogCreateResponse
import dev.ishflow.android.appshared.models.CreateWorkspaceRequest
import dev.ishflow.android.appshared.models.CreateWorkspaceResponse
import dev.ishflow.android.appshared.models.SeedDemoRequest
import dev.ishflow.android.appshared.models.SeedDemoResponse
import dev.ishflow.android.appshared.models.AttachmentRecord
import dev.ishflow.android.appshared.models.AttachmentsResponse
import dev.ishflow.android.appshared.models.AttachmentUploadRequest
import dev.ishflow.android.appshared.models.AttachmentUploadResponse
import dev.ishflow.android.appshared.models.CatalogListResponse
import dev.ishflow.android.appshared.models.CounterpartyListResponse
import dev.ishflow.android.appshared.models.Customer360Response
import dev.ishflow.android.appshared.models.DashboardResponse
import dev.ishflow.android.appshared.models.DocumentCreateResponse
import dev.ishflow.android.appshared.models.DocumentListResponse
import dev.ishflow.android.appshared.models.DocumentPostResponse
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.GrossProfit
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.OpenInvoicesResponse
import dev.ishflow.android.appshared.models.PaymentReceivedCreate
import dev.ishflow.android.appshared.models.PaymentSentCreate
import dev.ishflow.android.appshared.models.ProductPricesResponse
import dev.ishflow.android.appshared.models.PurchaseInvoiceCreate
import dev.ishflow.android.appshared.models.PushRegisterRequest
import dev.ishflow.android.appshared.models.PushUnregisterRequest
import dev.ishflow.android.appshared.models.RegisterBalanceResponse
import dev.ishflow.android.appshared.models.StockBatchResponse
import dev.ishflow.android.appshared.models.StockMovementsResponse
import dev.ishflow.android.appshared.models.SalesSummary
import dev.ishflow.android.appshared.models.SwitchTenantResponse
import kotlinx.serialization.json.JsonElement
import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

interface ApiService {
    @GET("/api/mobile/me")
    suspend fun getMe(): MeResponse

    /**
     * Returns the server-built Glance-and-Act dashboard layout. Same payload
     * the iOS app consumes; the `data` field on each widget is an opaque
     * JSON map decoded via [dev.ishflow.android.feature.dashboard.WidgetData]
     * accessors.
     */
    @GET("/api/mobile/dashboard")
    suspend fun getDashboardLayout(): DashboardResponse

    @GET("/api/mobile/documents/{type}")
    suspend fun listDocuments(
        @Path("type") type: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("q") query: String? = null,
        @Query("status") status: String? = null,
    ): DocumentListResponse

    @GET("/api/mobile/documents/{type}/{id}")
    suspend fun getDocument(@Path("type") type: String, @Path("id") id: String): DocumentRecord

    @POST("/api/mobile/documents/{type}")
    suspend fun createDocument(@Path("type") type: String, @Body body: JsonElement): DocumentCreateResponse

    /**
     * Update an existing SAVED / DRAFT document in place. Same wire shape as
     * [createDocument] (the server normalizes both via `_payload.ts`), but
     * routed through the engine's `updateDocument` so the original record is
     * mutated instead of producing a duplicate. Rejected with HTTP 4xx by
     * the engine if the record is POSTED.
     */
    @PATCH("/api/mobile/documents/{type}/{id}")
    suspend fun updateDocument(
        @Path("type") type: String,
        @Path("id") id: String,
        @Body body: JsonElement,
    ): DocumentCreateResponse

    @POST("/api/mobile/documents/{type}/{id}/post")
    suspend fun postDocument(@Path("type") type: String, @Path("id") id: String): DocumentPostResponse

    @POST("/api/mobile/documents/{type}/{id}/un-post")
    suspend fun unpostDocument(@Path("type") type: String, @Path("id") id: String): DocumentPostResponse

    /**
     * Streams a server-rendered PDF for a posted document. `type` matches the
     * existing document namespace (`sales.invoice`, `sales.payment_received`,
     * `purchases.invoice`, `purchases.payment_sent`). The body is
     * `application/pdf` — caller must close [ResponseBody] when done.
     */
    @Streaming
    @GET("/api/mobile/documents/{type}/{id}/pdf")
    suspend fun getDocumentPdf(@Path("type") type: String, @Path("id") id: String): ResponseBody

    @GET("/api/mobile/catalogs/{entity}")
    suspend fun listCatalog(
        @Path("entity") entity: String,
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
    ): CatalogListResponse

    /**
     * Creates a new catalog record for [entity] (e.g. `"sales.customer"`).
     * The backend requires an [idempotencyKey] to deduplicate retries.
     * Returns [CatalogCreateResponse] containing the full [CatalogRecord].
     *
     * Server route: `app/api/mobile/catalogs/[entity]/route.ts` (POST handler).
     */
    @POST("/api/mobile/catalogs/{entity}")
    suspend fun createCatalogRecord(
        @Path("entity") entity: String,
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body body: CatalogCreateRequest,
    ): CatalogCreateResponse

    /**
     * Creates a new `inventory.product` catalog record. Separate from
     * [createCatalogRecord] because the product form has richer optional fields
     * (unit, basePrice, barcode) that differ from the counterparty shape.
     */
    @POST("/api/mobile/catalogs/{entity}")
    suspend fun createCatalogProduct(
        @Path("entity") entity: String,
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body body: CatalogCreateProductRequest,
    ): CatalogCreateResponse

    /**
     * Without [groupBy] the server returns ONE aggregated row across the
     * register (suitable for dashboard KPIs). Pass a comma-separated list
     * of dimension names (`product,warehouse`) to get one row per group;
     * the response then carries `groupLabels` with resolved ref names.
     */
    @GET("/api/mobile/registers/{slug}/balance")
    suspend fun registerBalance(
        @Path("slug") slug: String,
        @Query("groupBy") groupBy: String? = null,
    ): RegisterBalanceResponse

    @POST("/api/mobile/push/register")
    suspend fun registerPush(@Body request: PushRegisterRequest)

    /**
     * Removes the push token server-side so the device no longer receives
     * notifications after sign-out. The backend uses DELETE with a JSON body
     * on the same `/api/mobile/push/register` route.
     */
    @DELETE("/api/mobile/push/register")
    suspend fun unregisterPush(@Body request: PushUnregisterRequest)

    /**
     * Switches the active tenant and returns a **freshly minted** mobile JWT
     * pinned to the target tenant. Caller MUST persist the new token in
     * `TokenStore` BEFORE refetching `/me`; otherwise the next request still
     * carries the previous tenant's `tid` claim and the backend resolves to
     * the old tenant — even though `publicMetadata.activeTenantId` was
     * updated. Mirrors the iOS switcher's contract.
     */
    @POST("/api/mobile/tenants/{tenantId}/switch")
    suspend fun switchTenant(@Path("tenantId") tenantId: String): SwitchTenantResponse

    /**
     * Creates a new tenant (workspace) for the authenticated user during onboarding.
     *
     * Maps to `POST /api/mobile/onboarding/tenant`. The server creates a Clerk
     * org, inserts a Tenant + Membership row, and returns a signed mobile JWT
     * valid for the new tenant.
     *
     * [name] — display name for the workspace (2–80 chars).
     * [currency] — ISO-4217 3-letter code (e.g. `"USD"`, `"RUB"`).
     * [locale] — UI locale hint (e.g. `"ru"`, `"en"`).
     */
    @POST("/api/mobile/onboarding/tenant")
    suspend fun createWorkspace(@Body request: CreateWorkspaceRequest): CreateWorkspaceResponse

    /**
     * Seeds demo data (customers, products, invoices, payments) for the given
     * tenant. The authenticated user must be the workspace owner. Idempotent —
     * re-running skips already-present rows.
     *
     * Server route: `app/api/mobile/onboarding/seed-demo/route.ts`.
     */
    @POST("/api/mobile/onboarding/seed-demo")
    suspend fun seedDemoData(@Body request: SeedDemoRequest): SeedDemoResponse

    // --- Faz 2 — Cari + typed document creates -------------------------------

    /**
     * Lists counterparties with computed A/R or A/P balance per row.
     * `type` is `"customer"` or `"supplier"`.
     */
    @GET("/api/mobile/counterparties")
    suspend fun listCounterparties(
        @Query("type") type: String? = null,
        @Query("q") query: String? = null,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50,
    ): CounterpartyListResponse

    /**
     * Creates a `sales.payment_received` document. Wire body uses `customer`
     * (UUID string), `note` (not `comment`), and decimal-string `amount`.
     */
    @POST("/api/mobile/documents/sales.payment_received")
    suspend fun createPaymentReceived(
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body body: PaymentReceivedCreate,
    ): DocumentCreateResponse

    /**
     * Creates a `purchases.invoice` document. Wire body uses `supplier`,
     * `warehouse`, and line field `price` (NOT `unitPrice`).
     */
    @POST("/api/mobile/documents/purchases.invoice")
    suspend fun createPurchaseInvoice(
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body body: PurchaseInvoiceCreate,
    ): DocumentCreateResponse

    /**
     * Creates a `purchases.payment_sent` document. Mirrors payment received
     * with `supplier` reference instead of `customer`.
     */
    @POST("/api/mobile/documents/purchases.payment_sent")
    suspend fun createPaymentSent(
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body body: PaymentSentCreate,
    ): DocumentCreateResponse

    /**
     * Returns the aggregated Customer / Supplier 360 payload: contact
     * details, current balance, 13-week balance sparkline, recent invoices,
     * recent payments, and a stock-out placeholder list. The `type` query
     * param chooses between the customer (sales) and supplier (purchases)
     * shape of the same endpoint.
     *
     * Server route: `app/api/mobile/counterparty-360/[id]/route.ts`.
     */
    @GET("/api/mobile/counterparty-360/{id}")
    suspend fun getCounterparty360(
        @Path("id") id: String,
        @Query("type") type: String,
    ): Customer360Response

    /**
     * Lists open invoices (totalAmount > paidAmount) for a counterparty so the
     * payment wizard can offer multi-link matching.
     *
     * `direction` is `"receivable"` (sales side: customers + sales.invoice)
     * or `"payable"` (purchases side: suppliers + purchases.invoice). Server
     * returns invoices oldest-first by docRef timestamp.
     */
    @GET("/api/mobile/payments/open-invoices")
    suspend fun getOpenInvoices(
        @Query("counterpartyId") counterpartyId: String,
        @Query("direction") direction: String,
    ): OpenInvoicesResponse

    /**
     * Resolved prices for a single product across every price type the tenant
     * has configured. The server returns all of them in one shot (no
     * `priceTypeId` filter); callers pick the entry they need client-side.
     * Server route: `app/api/mobile/products/[id]/prices/route.ts`.
     */
    @GET("/api/mobile/products/{id}/prices")
    suspend fun getProductPrices(
        @Path("id") productId: String,
    ): ProductPricesResponse

    // --- Wave 4 — Reports detail ----------------------------------------------

    /**
     * Downloads a report as an XLSX file. [type] is one of `"sales-summary"`,
     * `"ar-aging"`, or `"gross-profit"`. [from] and [to] are ISO-8601 date
     * strings (nullable for snapshot reports like ar-aging). The response body
     * must be consumed and closed by the caller.
     *
     * Server route: `app/api/mobile/reports/[type]/export/route.ts`.
     */
    @Streaming
    @GET("/api/mobile/reports/{type}/export")
    suspend fun exportReportXlsx(
        @Path("type") type: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): ResponseBody

    /** Period-bounded sales summary aggregated by customer + product. */
    @GET("/api/mobile/reports/sales-summary")
    suspend fun salesSummary(
        @Query("from") from: String,
        @Query("to") to: String,
    ): SalesSummary

    /** Snapshot A/R aging — buckets + per-customer outstanding. */
    @GET("/api/mobile/reports/ar-aging")
    suspend fun arAging(): ArAging

    /** Period-bounded revenue / COGS / margin per product. */
    @GET("/api/mobile/reports/gross-profit")
    suspend fun grossProfit(
        @Query("from") from: String,
        @Query("to") to: String,
    ): GrossProfit

    /**
     * Returns stock movements for a single product from the
     * `movement_inventory_stock_balance` register, ordered by date desc,
     * limit 50 by default. [warehouseId] narrows to a single warehouse.
     *
     * Server route: `app/api/mobile/inventory/movements/route.ts`.
     */
    @GET("/api/mobile/inventory/movements")
    suspend fun getStockMovements(
        @Query("productId") productId: String,
        @Query("warehouseId") warehouseId: String? = null,
        @Query("limit") limit: Int? = null,
    ): StockMovementsResponse

    /**
     * Batched per-warehouse stock balances for up to 100 products at a time.
     * `productIds` is a comma-separated UUID list. Used by the sales-wizard
     * product picker to hide products that have zero stock in the currently
     * selected warehouse.
     *
     * Server route: `app/api/mobile/inventory/stock/route.ts`.
     */
    @GET("/api/mobile/inventory/stock")
    suspend fun getStockBatch(
        @Query("productIds") productIds: String,
    ): StockBatchResponse

    /**
     * Returns per-warehouse balance rows for a single product. Delegates to
     * the generic register-balance endpoint with `groupBy=warehouse` and a
     * `product` dimension filter.
     *
     * Server route: `app/api/mobile/registers/[register]/balance/route.ts`.
     */
    @GET("/api/mobile/registers/inventory.stock/balance")
    suspend fun getStockBalancesByProduct(
        @Query("groupBy") groupBy: String = "warehouse",
        @Query("product") product: String,
    ): RegisterBalanceResponse

    /**
     * Step 1 of the two-call attachment upload: server creates the DB row
     * inside a tenant transaction, issues an R2 presigned PUT URL for the
     * blob, and returns the `attachmentId` plus a short-lived `downloadUrl`.
     *
     * Step 2 (the raw PUT) is performed by [dev.ishflow.android.core.attachments.AttachmentUploader]
     * directly against the returned `uploadUrl` — no separate "register" call
     * is needed because the row was created in step 1.
     */
    @POST("/api/mobile/attachments/upload")
    suspend fun uploadAttachmentSign(@Body body: AttachmentUploadRequest): AttachmentUploadResponse

    /**
     * Lists all non-deleted attachments for a document.
     * `kind` is the document namespace, e.g. `"purchases.invoice"`.
     *
     * Server route: app/api/mobile/documents/[type]/[id]/attachments/route.ts
     */
    @GET("/api/mobile/documents/{kind}/{id}/attachments")
    suspend fun listAttachments(
        @Path("kind") kind: String,
        @Path("id") id: String,
    ): AttachmentsResponse

    /**
     * Soft-deletes an attachment by its server-issued id.
     * Returns 204 on success (or if the attachment was already deleted).
     *
     * Server route: app/api/mobile/attachments/[id]/route.ts
     */
    @DELETE("/api/mobile/attachments/{id}")
    suspend fun deleteAttachment(@Path("id") id: String)

    /**
     * Creates a deep copy of an existing document and returns the new draft.
     * `kind` is the document namespace, e.g. `"sales.invoice"`.
     * The caller should provide a unique [idempotencyKey] so that network
     * retries do not produce duplicate records.
     */
    @POST("/api/mobile/documents/{kind}/{id}/clone")
    suspend fun cloneDocument(
        @Path("kind") kind: String,
        @Path("id") id: String,
        @Header("Idempotency-Key") idempotencyKey: String,
    ): DocumentCreateResponse

    // --- Billing ------------------------------------------------------------------

    /**
     * Returns the subscription / billing status for the active tenant.
     * Fields: plan, status, trialEnd (nullable ISO-8601), featureFlags.
     *
     * Server route: app/api/mobile/billing/route.ts
     */
    @GET("/api/mobile/billing")
    suspend fun getBilling(): BillingResponse

    /**
     * Creates (or retrieves) a billing portal URL for the active tenant.
     * The returned [BillingPortalResponse.url] should be opened in a
     * Chrome Custom Tab or external browser so the user can manage their
     * subscription without leaving the app UX.
     *
     * Server route: app/api/mobile/billing/portal/route.ts
     */
    @POST("/api/mobile/billing/portal")
    suspend fun createBillingPortalSession(): BillingPortalResponse

    /**
     * Permanently deletes the authenticated user's account.
     *
     * Returns 204 on success. Returns 409 with a JSON body containing
     * `code: "sole_owner_workspaces"` and `workspaces: [...]` if the user
     * is the sole owner of one or more tenants (the user must transfer
     * ownership first).
     *
     * Server route: app/api/mobile/me/account/route.ts
     */
    @DELETE("/api/mobile/me/account")
    suspend fun deleteAccount()
}
