package dev.ishflow.android.appshared

import dev.ishflow.android.appshared.models.ArAging
import dev.ishflow.android.appshared.models.ArAgingBucketLabel
import dev.ishflow.android.appshared.models.DocumentRecord
import dev.ishflow.android.appshared.models.DocumentStatus
import dev.ishflow.android.appshared.models.GrossProfit
import dev.ishflow.android.appshared.models.MeResponse
import dev.ishflow.android.appshared.models.RegisterBalanceResponse
import dev.ishflow.android.appshared.models.SalesSummary
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ModelDecodeTests {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun documentRecordDecodes() {
        val raw = """
            {
                "id":"00000000-0000-0000-0000-000000000001",
                "number":"INV-001",
                "date":"2026-04-26T00:00:00Z",
                "status":"POSTED",
                "createdAt":"2026-04-26T10:00:00Z",
                "updatedAt":"2026-04-26T10:00:00Z"
            }
        """.trimIndent()
        val record = json.decodeFromString<DocumentRecord>(raw)
        assertEquals("INV-001", record.number)
        assertEquals(DocumentStatus.POSTED, record.status)
    }

    @Test
    fun registerBalanceDecodesDecimalStrings() {
        val raw = """
            {
                "register":"inventory.stock",
                "asOf":"2026-04-26T00:00:00Z",
                "rows":[{"groupKey":{"warehouseId":"wh-1"},"quantity":"12.5","cost":"1234.56"}]
            }
        """.trimIndent()
        val resp = json.decodeFromString<RegisterBalanceResponse>(raw)
        assertEquals(BigDecimal("12.5"), resp.rows.first().quantity)
    }

    @Test
    fun salesSummaryDecodes() {
        val raw = """
            {
                "period":{"from":"2026-01-01T00:00:00Z","to":"2026-02-01T00:00:00Z"},
                "totalRevenue":"1200.00",
                "invoiceCount":3,
                "byCustomer":[{"customerId":"c1","customerName":"Alpha","total":"600.00","count":2}],
                "byProduct":[{"productId":"p1","productName":"Widget","qty":"5.00","revenue":"500.00"}]
            }
        """.trimIndent()
        val out = json.decodeFromString<SalesSummary>(raw)
        assertEquals(BigDecimal("1200.00"), out.totalRevenue)
        assertEquals(3, out.invoiceCount)
        assertEquals("Alpha", out.byCustomer.first().customerName)
    }

    @Test
    fun arAgingDecodesBucketLabels() {
        val raw = """
            {
                "asOf":"2026-05-10T00:00:00Z",
                "buckets":[
                  {"label":"0-30","total":"100.00","count":1},
                  {"label":"31-60","total":"0.00","count":0},
                  {"label":"61-90","total":"0.00","count":0},
                  {"label":"90+","total":"50.00","count":1}
                ],
                "byCustomer":[{"customerId":"c1","customerName":"Alpha","total":"100.00","oldestDays":12}]
            }
        """.trimIndent()
        val out = json.decodeFromString<ArAging>(raw)
        assertEquals(ArAgingBucketLabel.ZERO_TO_30, out.buckets[0].label)
        assertEquals(ArAgingBucketLabel.NINETY_PLUS, out.buckets[3].label)
        assertEquals(12, out.byCustomer.first().oldestDays)
    }

    @Test
    fun grossProfitDecodes() {
        val raw = """
            {
                "period":{"from":"2026-01-01T00:00:00Z","to":"2026-02-01T00:00:00Z"},
                "revenue":"300.00",
                "cogs":"180.00",
                "grossProfit":"120.00",
                "marginPct":"40.00",
                "byProduct":[
                  {"productId":"p1","productName":"Widget","revenue":"200.00","cogs":"120.00","profit":"80.00","marginPct":"40.00"}
                ]
            }
        """.trimIndent()
        val out = json.decodeFromString<GrossProfit>(raw)
        assertEquals(BigDecimal("120.00"), out.grossProfit)
        assertEquals(BigDecimal("40.00"), out.marginPct)
        assertEquals("Widget", out.byProduct.first().productName)
    }

    @Test
    fun meResponseHandlesNullTenant() {
        val raw = """
            {
                "user":{"id":"u1","email":"u@e.com"},
                "tenant":null,
                "permissions":[]
            }
        """.trimIndent()
        val me = json.decodeFromString<MeResponse>(raw)
        assertNull(me.tenant)
    }
}
