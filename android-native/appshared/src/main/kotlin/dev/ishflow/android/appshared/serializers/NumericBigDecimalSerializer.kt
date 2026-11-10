package dev.ishflow.android.appshared.serializers

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import java.math.BigDecimal

/**
 * Decimal serializer that round-trips against JSON numbers (NOT strings).
 *
 * Use this when the server emits raw JSON numeric tokens (e.g. `100.50` rather
 * than `"100.50"`). [BigDecimalSerializer] expects strings and throws on
 * `decodeString` against a numeric token. Wire endpoints currently using
 * numbers: `GET /api/mobile/payments/open-invoices`.
 *
 * Outbound: encodes the value as a JSON number via `JsonEncoder.encodeJsonElement`
 * so amounts arrive as `123.45`, not `"123.45"` — this is required by the
 * server-side `parseLinkedInvoices` helper in
 * `configs/sales/documents/payment-received.ts`, which keeps only entries with
 * `typeof item.amount === 'number'`.
 *
 * Falls back to `decodeDouble()` / `decodeString()` when the decoder is not a
 * `JsonDecoder` (e.g. unit tests that go through a non-JSON format), so the
 * type remains usable in any format with reasonable string/number support.
 */
object NumericBigDecimalSerializer : KSerializer<BigDecimal> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("BigDecimalNumeric", PrimitiveKind.DOUBLE)

    override fun serialize(encoder: Encoder, value: BigDecimal) {
        if (encoder is JsonEncoder) {
            encoder.encodeJsonElement(JsonPrimitive(value))
        } else {
            encoder.encodeDouble(value.toDouble())
        }
    }

    override fun deserialize(decoder: Decoder): BigDecimal {
        if (decoder is JsonDecoder) {
            val element = decoder.decodeJsonElement()
            if (element is JsonPrimitive) {
                element.content.toBigDecimalOrNull()?.let { return it }
                element.doubleOrNull?.let { return BigDecimal.valueOf(it) }
            }
            error("Expected JSON number or numeric string for BigDecimal, got $element")
        }
        return BigDecimal.valueOf(decoder.decodeDouble())
    }
}
