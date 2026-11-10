import type { TenantPlan } from '@prisma/client';

export class PermissionDeniedError extends Error {
  constructor(
    public configId: string,
    public op: string,
  ) {
    super(`permission denied: ${op} on ${configId}`);
    this.name = 'PermissionDeniedError';
  }
}

export class NotFoundError extends Error {
  constructor(
    public configId: string,
    public id: string,
  ) {
    super(`not found: ${configId}#${id}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when a catalog record can't be archived because it is still
 * referenced by live data (e.g. a warehouse that still holds stock). Prevents
 * orphaning movements/documents (QA H11b#80, M9).
 */
export class ReferentialError extends Error {
  constructor(
    public configId: string,
    public id: string,
    public reason: string,
  ) {
    super(`cannot archive ${configId}#${id}: still referenced (${reason})`);
    this.name = 'ReferentialError';
  }
}

export class InvalidStatusError extends Error {
  constructor(
    public configId: string,
    public id: string,
    public currentStatus: string,
    public op: string,
  ) {
    super(`invalid status: ${op} on ${configId}#${id} — current status is ${currentStatus}`);
    this.name = 'InvalidStatusError';
  }
}

export class PostingValidationError extends Error {
  constructor(
    public configId: string,
    public id: string,
    public reason: string,
  ) {
    super(`posting validation failed for ${configId}#${id}: ${reason}`);
    this.name = 'PostingValidationError';
  }
}

export class PeriodClosedError extends Error {
  constructor(
    public readonly module: string,
    public readonly closedThrough: Date,
    public readonly attempted: Date,
  ) {
    super(
      `Period closed through ${closedThrough.toISOString()} for module "${module}"; attempted ${attempted.toISOString()}`,
    );
    this.name = 'PeriodClosedError';
  }
}

export class ViewAsReadOnlyError extends Error {
  constructor(public readonly role: string) {
    super(`View-as-role "${role}" is read-only; mutating operations are blocked.`);
    this.name = 'ViewAsReadOnlyError';
  }
}

export type PlanLimitKind =
  | 'members'
  | 'monthly_posted_docs'
  | 'storage_bytes'
  | 'saved_views'
  | 'advanced_reports'
  | 'period_close'
  | 'api_access'
  | 'custom_branding'
  | 'sso';

export interface PlanLimitErrorJSON {
  error: 'plan_limit_exceeded';
  kind: PlanLimitKind;
  current: number;
  allowed: number;
  upgradeTo: TenantPlan | null;
}

/**
 * Thrown by `assertPlanAllows` when a tenant's action would breach its plan
 * ceiling or attempts a feature gated behind a higher plan. Carries enough
 * context for the route layer to serialize a 402 response and for the
 * client to render an "upgrade to X" CTA.
 */
export class PlanLimitError extends Error {
  constructor(
    public readonly kind: PlanLimitKind,
    public readonly current: number,
    public readonly allowed: number,
    public readonly upgradeTo: TenantPlan | null,
  ) {
    super(`Plan limit exceeded for ${kind}: ${current} / ${allowed}`);
    this.name = 'PlanLimitError';
  }

  toJSON(): PlanLimitErrorJSON {
    return {
      error: 'plan_limit_exceeded',
      kind: this.kind,
      current: this.current,
      allowed: this.allowed,
      upgradeTo: this.upgradeTo,
    };
  }
}

/**
 * The engine error classes above carry developer-authored, user-safe messages
 * (e.g. "insufficient stock", "still referenced"). Everything else — Prisma
 * errors, generic Errors — can leak schema/internal detail and MUST NOT be
 * echoed to clients. `safeErrorMessage` returns the message only for the known
 * safe error types, and a generic fallback otherwise. Findings H3/H7.
 */
const USER_SAFE_ERRORS = [
  PermissionDeniedError,
  NotFoundError,
  ReferentialError,
  InvalidStatusError,
  PostingValidationError,
  PeriodClosedError,
  ViewAsReadOnlyError,
  PlanLimitError,
] as const;

export function isUserSafeError(err: unknown): err is Error {
  return USER_SAFE_ERRORS.some((Cls) => err instanceof Cls);
}

export function safeErrorMessage(err: unknown, fallback = 'request failed'): string {
  return isUserSafeError(err) ? err.message : fallback;
}
