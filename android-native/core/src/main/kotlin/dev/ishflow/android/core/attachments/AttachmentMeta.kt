package dev.ishflow.android.core.attachments

/**
 * Result of a successful attachment upload.
 *
 * Returned by [AttachmentUploader.upload]; consumed by wizard ViewModels
 * so the UI can render thumbnails and the eventual document-create body
 * can ship the server-issued ids on the [`attachmentDraftId`] rebind path.
 *
 * Fields mirror the server response on `POST /api/mobile/attachments/upload`
 * — see `packages/mobile-api-contract/src/attachments.ts`
 * (`AttachmentUploadResponse`) plus the original request metadata.
 */
data class AttachmentMeta(
    val id: String,
    val name: String,
    val sizeBytes: Long,
    val mimeType: String,
    val downloadUrl: String,
)
