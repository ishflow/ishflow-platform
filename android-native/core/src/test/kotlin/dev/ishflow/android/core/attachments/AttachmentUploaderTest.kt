package dev.ishflow.android.core.attachments

import android.content.ContentResolver
import android.content.Context
import android.database.Cursor
import android.net.Uri
import dev.ishflow.android.apiclient.ApiService
import dev.ishflow.android.appshared.models.AttachmentUploadRequest
import dev.ishflow.android.appshared.models.AttachmentUploadResponse
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AttachmentUploaderTest {

    private lateinit var server: MockWebServer
    private lateinit var api: ApiService
    private lateinit var context: Context
    private lateinit var resolver: ContentResolver

    @BeforeEach
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = mockk()
        context = mockk()
        resolver = mockk()
        every { context.contentResolver } returns resolver
    }

    @AfterEach
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `upload signs then PUTs and returns meta`() = runTest {
        val uri = mockk<Uri>(relaxed = true)
        every { uri.lastPathSegment } returns "receipt.jpg"
        val payload = byteArrayOf(1, 2, 3, 4, 5)
        every { resolver.getType(uri) } returns "image/jpeg"
        every { resolver.openInputStream(uri) } returns ByteArrayInputStream(payload)
        val cursor = mockk<Cursor>(relaxed = true)
        every { cursor.moveToFirst() } returns true
        every { cursor.getColumnIndex(any()) } returns 0
        every { cursor.getString(0) } returns "receipt.jpg"
        every { resolver.query(uri, any(), null, null, null) } returns cursor

        val signSlot = slot<AttachmentUploadRequest>()
        val r2Url = server.url("/r2/receipt").toString()
        coEvery { api.uploadAttachmentSign(capture(signSlot)) } returns AttachmentUploadResponse(
            attachmentId = "att-1",
            uploadUrl = r2Url,
            downloadUrl = "https://example/download/att-1",
        )
        server.enqueue(MockResponse().setResponseCode(200))

        val uploader = AttachmentUploader(api = api, okHttp = OkHttpClient(), context = context)

        val result = uploader.upload(uri, "document.purchases.invoice", "draft-99")

        assertTrue(result.isSuccess, "result=$result")
        val meta = result.getOrNull()!!
        assertEquals("att-1", meta.id)
        assertEquals("receipt.jpg", meta.name)
        assertEquals(payload.size.toLong(), meta.sizeBytes)
        assertEquals("image/jpeg", meta.mimeType)
        assertEquals("https://example/download/att-1", meta.downloadUrl)

        val signed = signSlot.captured
        assertEquals("receipt.jpg", signed.fileName)
        assertEquals("image/jpeg", signed.mimeType)
        assertEquals(payload.size.toLong(), signed.size)
        assertEquals("document.purchases.invoice", signed.entity)
        assertEquals("draft-99", signed.entityId)

        val putRequest = server.takeRequest()
        assertEquals("PUT", putRequest.method)
        assertEquals("image/jpeg", putRequest.getHeader("Content-Type"))
        assertEquals(payload.size, putRequest.bodySize.toInt())

        coVerify(exactly = 1) { api.uploadAttachmentSign(any()) }
    }

    @Test
    fun `R2 5xx surfaces as Result_failure`() = runTest {
        val uri = mockk<Uri>(relaxed = true)
        every { uri.lastPathSegment } returns "doc.pdf"
        every { resolver.getType(uri) } returns "application/pdf"
        every { resolver.openInputStream(uri) } returns ByteArrayInputStream(byteArrayOf(9))
        val cursor = mockk<Cursor>(relaxed = true)
        every { cursor.moveToFirst() } returns true
        every { cursor.getColumnIndex(any()) } returns 0
        every { cursor.getString(0) } returns "doc.pdf"
        every { resolver.query(uri, any(), null, null, null) } returns cursor

        coEvery { api.uploadAttachmentSign(any()) } returns AttachmentUploadResponse(
            attachmentId = "att-2",
            uploadUrl = server.url("/r2/fail").toString(),
            downloadUrl = "https://example/download/att-2",
        )
        server.enqueue(MockResponse().setResponseCode(503))

        val uploader = AttachmentUploader(api = api, okHttp = OkHttpClient(), context = context)
        val result = uploader.upload(uri, "document.purchases.invoice", "draft-1")

        assertTrue(result.isFailure)
    }
}
