package dev.ishflow.android.feature.dashboard.widgets

import dev.ishflow.android.appshared.models.WidgetDescriptor
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.assertEquals
import org.junit.Test

class NetPositionConsumedIdsTest {

    @Test
    fun `consumes the four headline widgets when AR + AP are present`() {
        val hero = listOf(
            kpiWidget("kpi.receivables", value = "1000"),
            kpiWidget("kpi.payables", value = "300"),
            kpiWidget("kpi.thisMonthSales", value = "500"),
            kpiWidget("kpi.openInvoices", count = 3),
            kpiWidget("kpi.cashPosition", value = "0"),
        )
        val consumed = netPositionConsumedIds(hero)
        assertEquals(
            setOf(
                "kpi.receivables",
                "kpi.payables",
                "kpi.thisMonthSales",
                "kpi.openInvoices",
            ),
            consumed,
        )
    }

    @Test
    fun `returns empty when AR is missing — caller falls back to HeroKpiCard`() {
        val hero = listOf(
            kpiWidget("kpi.payables", value = "300"),
            kpiWidget("kpi.cashPosition", value = "0"),
        )
        assertEquals(emptySet(), netPositionConsumedIds(hero))
    }

    @Test
    fun `returns empty when AP is missing`() {
        val hero = listOf(
            kpiWidget("kpi.receivables", value = "1000"),
            kpiWidget("kpi.cashPosition", value = "0"),
        )
        assertEquals(emptySet(), netPositionConsumedIds(hero))
    }

    @Test
    fun `returns empty for a hero list that lacks both AR and AP`() {
        val hero = listOf(
            kpiWidget("kpi.lowStockCount", count = 5),
            kpiWidget("kpi.cashPosition", value = "0"),
        )
        assertEquals(emptySet(), netPositionConsumedIds(hero))
    }

    private fun kpiWidget(id: String, value: String? = null, count: Int? = null): WidgetDescriptor {
        val data = mutableMapOf<String, kotlinx.serialization.json.JsonElement>()
        value?.let { data["value"] = JsonPrimitive(it) }
        count?.let { data["count"] = JsonPrimitive(it) }
        return WidgetDescriptor(id = id, type = "kpi", data = data)
    }
}
