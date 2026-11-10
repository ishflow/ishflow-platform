/**
 * `/api/v1` response helpers.
 *
 * The public API uses a fixed JSON envelope so external consumers can rely on
 * a stable shape:
 *
 *   Success:  { "data": ... [, "pagination": {...}] }
 *   Error:    { "error": { "code", "message" [, "details"] } }
 *
 * See the internal design spec §"Request /
 * response contract" and §"Error codes". By project convention,
 * we never `.parse()` outbound payloads — Prisma rows + `serializeRow` are
 * trusted to produce the right shape.
 */

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Build a success envelope. Optional `pagination` is forwarded verbatim. The
 * default status is 200; pass 201 for create endpoints. Always returns JSON
 * with `Content-Type: application/json` (set by `Response.json`).
 */
export function respondData<T>(data: T, pagination?: Pagination, status = 200): Response {
  const body: { data: T; pagination?: Pagination } = { data };
  if (pagination) body.pagination = pagination;
  return Response.json(body, { status });
}

/**
 * Build an error envelope. `code` is the stable machine-readable identifier
 * (e.g. `unauthorized`, `validation_error`); `message` is human-readable;
 * `details` is an optional bag of additional context (e.g. Zod issues).
 */
export function respondError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const error: { code: string; message: string; details?: Record<string, unknown> } = {
    code,
    message,
  };
  if (details) error.details = details;
  return Response.json({ error }, { status });
}

/**
 * Parse the optional `?updatedSince=<ISO8601>` incremental-sync query param.
 *
 * Returns:
 *   - `null`      when the param is absent → no filter applied.
 *   - a `Date`    when it parses to a valid ISO 8601 date-time.
 *   - `'invalid'` when present but unparseable → caller emits a
 *     `validation_error` envelope.
 *
 * Used by the v1 LIST routes so 1C can pull "everything changed since T"
 * by adding `where: { updatedAt: { gte: <Date> } }` to the Prisma query.
 */
export function parseUpdatedSince(raw: string | null): Date | null | 'invalid' {
  if (raw === null || raw === '') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'invalid';
  return parsed;
}
