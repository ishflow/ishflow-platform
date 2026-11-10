/**
 * Typed error surface for MCP tool handlers.
 *
 * `mapErrorToToolResult` sanitizes any thrown value into a client-safe
 * envelope: never leaks stacks, SQL fragments, Prisma codes, env values, or
 * other internal state. Supports an opt-in `__t:<key>` message prefix that
 * resolves through the per-locale catalog in `./i18n`.
 */
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { tr } from './i18n';

export type ToolErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'tenant_required'
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'precondition_failed'
  | 'rate_limited'
  | 'internal_error';

export interface ToolErrorPayload {
  code: ToolErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class ToolError extends Error {
  constructor(
    public code: ToolErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ToolError';
  }

  toJSON(): ToolErrorPayload {
    return { code: this.code, message: this.message, details: this.details };
  }
}

/**
 * Resolve a `__t:<key>` message reference against the locale catalog. Plain
 * (non-prefixed) messages are returned as-is. Unknown keys fall back to the
 * original literal so callers can still observe the placeholder during
 * development.
 */
function translate(message: string, locale: string): string {
  if (message.startsWith('__t:')) {
    return tr(message.slice(4), locale) ?? message;
  }
  return message;
}

/**
 * Sanitize an error into the typed MCP envelope. NEVER leaks stacks, SQL,
 * column names, env values, or Prisma codes to the client. Always returns a
 * fresh, client-safe payload.
 */
export function mapErrorToToolResult(err: unknown, locale: string): ToolErrorPayload {
  if (err instanceof ToolError) {
    return {
      code: err.code,
      message: translate(err.message, locale),
      details: err.details,
    };
  }

  if (err instanceof ZodError) {
    return {
      code: 'validation_error',
      message: translate('__t:tool.errors.validation_error', locale),
      details: {
        issues: err.issues.map((i) => ({
          path: i.path,
          code: i.code,
          message: i.message,
        })),
      },
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return { code: 'conflict', message: translate('__t:tool.errors.conflict', locale) };
    }
    if (err.code === 'P2025') {
      return { code: 'not_found', message: translate('__t:tool.errors.not_found', locale) };
    }
    // Any other Prisma known-request error is bucketed under internal_error;
    // never echo the raw code or message to the caller.
    return {
      code: 'internal_error',
      message: translate('__t:tool.errors.internal_error', locale),
    };
  }

  // Anything else (incl. PrismaClientUnknownRequestError, network errors,
  // assertion failures, raw Errors). Sanitize aggressively.
  return {
    code: 'internal_error',
    message: translate('__t:tool.errors.internal_error', locale),
  };
}
