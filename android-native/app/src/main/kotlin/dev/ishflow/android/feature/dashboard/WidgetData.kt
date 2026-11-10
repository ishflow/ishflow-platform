package dev.ishflow.android.feature.dashboard

import dev.ishflow.android.appshared.models.WidgetDescriptor
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Typed accessors for server-emitted [WidgetDescriptor.data] payloads.
 *
 * The server keeps `data` as an opaque JSON map so new widget shapes ship
 * without a client release; these helpers translate the known keys into
 * Kotlin types the renderers can switch on. Unknown / malformed keys fall
 * back to null so a partial payload never crashes the dashboard.
 */
internal data class ActivityListItem(
    val id: String,
    val name: String? = null,
    val amount: String? = null,
    val date: String? = null,
    val kind: String? = null,
    val label: String? = null,
    val href: String? = null,
    val timestamp: String? = null,
)

internal val WidgetDescriptor.kpiValue: String? get() = data["value"]?.asString()

internal val WidgetDescriptor.kpiDelta: Double? get() = data["delta"]?.asDouble()

internal val WidgetDescriptor.kpiCount: Int? get() = data["count"]?.asInt()

internal val WidgetDescriptor.kpiThreshold: Int? get() = data["threshold"]?.asInt()

/**
 * Optional time-series the server can attach to a KPI widget to power a
 * sparkline. Decoded as a flat list of doubles (oldest → newest). The
 * server doesn't emit this yet; the hero card synthesizes a tiny preview
 * from `kpiDelta` so we can land the rendering pipeline in advance.
 */
internal val WidgetDescriptor.kpiSparkline: List<Double>?
    get() = data["series"]?.asListOfDoubles()

internal val WidgetDescriptor.listItems: List<ActivityListItem>
    get() = data["items"]?.asListOfObjects().orEmpty().map { it.toListItem() }

private fun JsonObject.toListItem(): ActivityListItem = ActivityListItem(
    id = this["id"]?.asString().orEmpty(),
    name = this["name"]?.asString(),
    amount = this["amount"]?.asString(),
    date = this["date"]?.asString(),
    kind = this["kind"]?.asString(),
    label = this["label"]?.asString(),
    href = this["href"]?.asString(),
    timestamp = this["timestamp"]?.asString(),
)

private fun JsonElement.asString(): String? = (this as? JsonPrimitive)?.contentOrNull

private fun JsonElement.asDouble(): Double? = (this as? JsonPrimitive)?.doubleOrNull

private fun JsonElement.asInt(): Int? = (this as? JsonPrimitive)?.intOrNull

private fun JsonElement.asListOfObjects(): List<JsonObject>? =
    (this as? JsonArray)?.mapNotNull { it as? JsonObject }

private fun JsonElement.asListOfDoubles(): List<Double>? =
    (this as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.doubleOrNull }
