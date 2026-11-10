package dev.ishflow.android.appshared.serializers

import dev.ishflow.android.appshared.models.PartyRef
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/**
 * Covers the dual-shape decoder that fixes the `$.record.supplier` /
 * `$.record.customer` parse error after POST `/api/mobile/documents/[type]`.
 *
 * Server contracts:
 *  - List / GET endpoints (`enrichDocumentListRows`) → object form
 *    `{"id": "...", "name": "..."}`.
 *  - POST create response (raw engine record) → primitive form `"uuid-string"`.
 */
class PartyRefSerializerTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun decodesObjectForm() {
        val raw = """{"id":"abc","name":"Acme"}"""
        val ref = json.decodeFromString(PartyRefSerializer, raw)
        assertEquals(PartyRef(id = "abc", name = "Acme"), ref)
    }

    @Test
    fun decodesPrimitiveStringForm() {
        val raw = "\"abc\""
        val ref = json.decodeFromString(PartyRefSerializer, raw)
        assertEquals(PartyRef(id = "abc", name = ""), ref)
    }

    @Test
    fun roundTripsObjectForm() {
        val ref = PartyRef(id = "abc", name = "Acme")
        val encoded = json.encodeToString(PartyRefSerializer, ref)
        val decoded = json.decodeFromString(PartyRefSerializer, encoded)
        assertEquals(ref, decoded)
    }
}
