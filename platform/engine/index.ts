export {
  countRecords,
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  listRecordsPaged,
  restoreRecord,
  updateRecord,
} from './crud';
export type { ListOptions, ListResult } from './crud';
export {
  countDocuments,
  createDocument,
  deleteDocument,
  getDocument,
  listDocumentsPaged,
  rollbackDraftDocument,
  updateDocument,
} from './document-crud';
export type { DocumentListOptions, DocumentListResult } from './document-crud';
export { enrichDocumentListRows } from './document-list-enrich';
export type { EnrichedRef } from './document-list-enrich';
export {
  InvalidStatusError,
  isUserSafeError,
  NotFoundError,
  PeriodClosedError,
  PermissionDeniedError,
  PlanLimitError,
  PostingValidationError,
  safeErrorMessage,
} from './errors';
export type { PlanLimitErrorJSON, PlanLimitKind } from './errors';
export { checkPeriodOpen, getPeriodClose, setPeriodClose } from './period-close';
export type { PeriodCloseRow } from './period-close';
export { check } from './permissions';
export { postDocument, unpostDocument } from './posting';
export {
  getCatalogPresentation,
  getDocumentPresentation,
  getPresentation,
  getPresentationByRef,
  getPresentationsByRefs,
} from './presentation';
export type { PresentationByRefOptions } from './presentation';
export { getPresentationsForRefs, presentationKey } from './presentation-batch';
export type { PresentationRef } from './presentation-batch';
export { resolveRefLabels } from './resolve-ref-labels';
export {
  assertEntityAccess,
  createAttachment,
  deleteAttachment,
  getAttachment,
  getParentDocStatus,
  listAttachments,
} from './attachments';
export type { AttachmentInput, AttachmentRow } from './attachments';
export { writeAudit } from './audit-log';
export type { AuditAction, AuditSource } from './audit-log';
export {
  applyReferenceFilters,
  getReferenceFilter,
  registerReferenceFilter,
  resolveReference,
  searchReference,
} from './reference-search';
export type {
  ReferenceFilter,
  ResolveReferenceArgs,
  SearchReferenceArgs,
} from './reference-search';
export {
  balanceAsOf,
  listMovementsPaged,
  movementDelegate,
  registerBalance,
  registerBalanceAll,
  registerBalanceGrouped,
  turnover,
} from './register-query';
export type { MovementPage, TurnoverRow } from './register-query';
export {
  createSavedView,
  deleteSavedView,
  getSavedView,
  listSavedViews,
} from './saved-views';
export type { SavedViewInput } from './saved-views';
export { buildZodSchema } from './zod-schema';
export { resolveIdempotency, storeIdempotency } from './idempotency';
export type { IdempotencyHit } from './idempotency';
