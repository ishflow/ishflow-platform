import { describe, expect, it } from 'vitest';
import {
  NotFoundError,
  PostingValidationError,
  ReferentialError,
  safeErrorMessage,
} from './errors';

/**
 * Findings H3/H7: route handlers echoed raw `err.message` to clients, leaking
 * Prisma/internal schema text. `safeErrorMessage` surfaces a message ONLY for
 * the developer-authored, user-safe engine error classes, and a generic
 * fallback for everything else (Prisma errors, generic Errors, non-Errors).
 */
describe('safeErrorMessage', () => {
  it('surfaces messages from known user-safe engine errors', () => {
    expect(
      safeErrorMessage(new PostingValidationError('sales.invoice', 'id', 'insufficient stock')),
    ).toContain('insufficient stock');
    expect(safeErrorMessage(new NotFoundError('catalog.x', 'abc'))).toContain('not found');
    expect(
      safeErrorMessage(new ReferentialError('catalog.warehouse', 'id', 'still holds stock')),
    ).toContain('still referenced');
  });

  it('hides generic / Prisma error text behind the fallback', () => {
    const prismaish = new Error(
      'Invalid `prisma.user.create()` invocation: Unique constraint failed on the fields: (`secret_token`)',
    );
    expect(safeErrorMessage(prismaish, 'create failed')).toBe('create failed');
    expect(safeErrorMessage(prismaish)).toBe('request failed');
    expect(safeErrorMessage(prismaish)).not.toContain('secret_token');
  });

  it('handles non-Error throwables', () => {
    expect(safeErrorMessage('boom', 'x')).toBe('x');
    expect(safeErrorMessage(undefined, 'y')).toBe('y');
  });
});
