/**
 * Public surface of the AI Invoice OCR addon. The dynamic addon home
 * shell + the purchases/invoice/new server component import only from
 * this barrel; the rest of the module is internal.
 */

export { AddonUnconfiguredError, getModel, getModelName } from './ai-client';
export {
  matchProductFromCandidates,
  matchSupplierFromCandidates,
  matchSupplier,
  matchProductsForLines,
  normalizeName,
  tokenOverlap,
  tokenize,
  type ProductCandidate,
  type SupplierCandidate,
} from './match';
export { pollOcrJob, type OcrJobLineView, type OcrJobView } from './poll-ocr-job';
export { runOcrJob, __setAiOverrides } from './run-ocr-job';
export {
  isAllowedOcrMime,
  OCR_ALLOWED_MIME_TYPES,
  OCR_MAX_FILE_BYTES,
  ocrInvoiceSchema,
  ocrLineSchema,
  type OcrAllowedMime,
  type OcrInvoice,
  type OcrLine,
} from './schemas';
export {
  InvalidOcrFileError,
  startOcrJob,
  type StartOcrJobInput,
  type StartOcrJobResult,
} from './start-ocr-job';
