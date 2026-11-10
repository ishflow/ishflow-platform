package dev.ishflow.android.appshared.models

import kotlinx.serialization.Serializable

/**
 * A single attachment returned by `GET /api/mobile/documents/{kind}/{id}/attachments`.
 */
@Serializable
data class AttachmentRecord(
    val id: String,
    val fileName: String,
    val sizeBytes: Long,
    val createdAt: String,
    val signedUrl: String? = null,
)

/**
 * Wrapper response from `GET /api/mobile/documents/{kind}/{id}/attachments`.
 */
@Serializable
data class AttachmentsResponse(
    val attachments: List<AttachmentRecord>,
)

/**
 * Request body for `POST /api/mobile/attachments/upload`.
 *
 * Mirrors `AttachmentUploadRequestSchema` in
 * `packages/mobile-api-contract/src/attachments.ts`. `entity` is the
 * config slug (`document.purchases.invoice`, `document.sales.invoice`,
 * …) and `entityId` is the wizard-supplied draft UUID — the server
 * rebinds those rows to the real document id when the wizard later
 * sends `attachmentDraftId` on the create call.
 */
@Serializable
data class AttachmentUploadRequest(
    val fileName: String,
    val mimeType: String,
    val size: Long,
    val entity: String,
    val entityId: String,
)

/**
 * Response from `POST /api/mobile/attachments/upload`.
 *
 * `uploadUrl` is a short-lived R2 presigned PUT URL; clients must PUT the
 * file bytes there with the same `Content-Type` they declared, then no
 * second "register" call is needed — the row was created in the same
 * transaction. `downloadUrl` is good for ~1 hour.
 */
@Serializable
data class AttachmentUploadResponse(
    val attachmentId: String,
    val uploadUrl: String,
    val downloadUrl: String,
)
