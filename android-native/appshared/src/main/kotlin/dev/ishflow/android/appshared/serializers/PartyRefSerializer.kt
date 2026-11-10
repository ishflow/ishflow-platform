package dev.ishflow.android.appshared.serializers

import dev.ishflow.android.appshared.models.PartyRef
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/**
 * Accepts both server response shapes for counterparty references:
 *
 * - `{"id": "uuid", "name": "Acme"}` — resolved object (list / GET endpoints
 *   enriched via `enrichDocumentListRows`).
 * - `"uuid-string"` — raw FK value (POST create response from the engine,
 *   which returns the column without resolving the join).
 *
 * The raw-string branch returns `PartyRef(id = uuid, name = "")` so the UI
 * still has an id to navigate by; the empty name surfaces as "—" / blank
 * which the screen can detect and decide whether to refetch.
 */
object PartyRefSerializer : KSerializer<PartyRef> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("PartyRef")

    override fun deserialize(decoder: Decoder): PartyRef {
        val input = decoder as? JsonDecoder
            ?: throw SerializationException("PartyRefSerializer requires JSON")
        return when (val element: JsonElement = input.decodeJsonElement()) {
            is JsonPrimitive -> {
                val id = element.contentOrNull
                    ?: throw SerializationException("PartyRef primitive missing content")
                PartyRef(id = id, name = "")
            }
            is JsonObject -> {
                val id = element["id"]?.jsonPrimitive?.contentOrNull
                    ?: throw SerializationException("PartyRef object missing 'id'")
                val name = element["name"]?.jsonPrimitive?.contentOrNull ?: ""
                PartyRef(id = id, name = name)
            }
            else -> throw SerializationException("PartyRef expects object or string, got $element")
        }
    }

    override fun serialize(encoder: Encoder, value: PartyRef) {
        // Symmetric with the object form on the wire.
        val json = JsonObject(
            mapOf(
                "id" to JsonPrimitive(value.id),
                "name" to JsonPrimitive(value.name),
            ),
        )
        (encoder as? kotlinx.serialization.json.JsonEncoder
            ?: throw SerializationException("PartyRefSerializer requires JSON"))
            .encodeJsonElement(json)
    }
}
