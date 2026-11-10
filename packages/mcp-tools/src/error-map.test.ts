import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';
import { mapErrorToToolResult, ToolError } from './error-map';

describe('mapErrorToToolResult', () => {
  it('maps a ToolError directly with its code and message', () => {
    const e = new ToolError('forbidden', 'nope');
    const r = mapErrorToToolResult(e, 'en');
    expect(r.code).toBe('forbidden');
    expect(r.message).toBe('nope');
  });

  it('maps ZodError to validation_error with sanitized issue paths', () => {
    const schema = z.object({ x: z.number() });
    let zerr: ZodError | undefined;
    try {
      schema.parse({ x: 'no' });
      throw new Error('unreached');
    } catch (e) {
      zerr = e as ZodError;
    }
    expect(zerr).toBeDefined();
    const r = mapErrorToToolResult(zerr as ZodError, 'en');
    expect(r.code).toBe('validation_error');
    expect(r.message).toBeTruthy();
    expect(r.details).toBeDefined();
  });

  it('maps Prisma P2002 (unique constraint) to conflict', () => {
    const e = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
    });
    const r = mapErrorToToolResult(e, 'en');
    expect(r.code).toBe('conflict');
    expect(r.message).not.toContain('Unique constraint failed');
    expect(r.message).not.toContain('P2002');
  });

  it('maps Prisma P2025 (record not found) to not_found', () => {
    const e = new Prisma.PrismaClientKnownRequestError('Record to update not found', {
      code: 'P2025',
      clientVersion: '5.22.0',
    });
    const r = mapErrorToToolResult(e, 'en');
    expect(r.code).toBe('not_found');
    expect(r.message).not.toContain('P2025');
  });

  it('maps an unknown Error to internal_error with NO leaked internals', () => {
    const e = new Error(
      'Database connection string: postgresql://canalog_app:secret@host/db (column "tenant_id" not found in table customers)',
    );
    const r = mapErrorToToolResult(e, 'en');
    expect(r.code).toBe('internal_error');
    expect(r.message).not.toContain('postgresql://');
    expect(r.message).not.toContain('secret');
    expect(r.message).not.toContain('canalog_app');
    expect(r.message).not.toContain('tenant_id');
    expect(r.message).not.toContain('customers');
    expect(r.details).toBeUndefined();
  });

  it('translates messages by locale via the __t: prefix', () => {
    const e = new ToolError('not_found', '__t:tool.errors.not_found');
    const en = mapErrorToToolResult(e, 'en');
    const ru = mapErrorToToolResult(e, 'ru');
    expect(en.message).not.toBe('__t:tool.errors.not_found');
    expect(ru.message).not.toBe('__t:tool.errors.not_found');
    expect(en.message).not.toBe(ru.message);
  });

  it('falls back to en for unknown locales', () => {
    const e = new ToolError('not_found', '__t:tool.errors.not_found');
    const r = mapErrorToToolResult(e, 'xx');
    expect(r.message).toBeTruthy();
    // Whatever EN says, that's what an unknown locale falls back to.
    const en = mapErrorToToolResult(e, 'en');
    expect(r.message).toBe(en.message);
  });

  it('leaves non-prefixed messages literal (no double-translation)', () => {
    const e = new ToolError('forbidden', 'custom literal message');
    const r = mapErrorToToolResult(e, 'ru');
    expect(r.message).toBe('custom literal message');
  });
});
