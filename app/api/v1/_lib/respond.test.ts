import { describe, expect, it } from 'vitest';
import { respondData, respondError } from './respond';

describe('respondData', () => {
  it('emits a 200 JSON envelope without pagination', async () => {
    const res = respondData({ id: 'p1', name: 'Widget' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    const body = await res.json();
    expect(body).toEqual({ data: { id: 'p1', name: 'Widget' } });
    expect(body.pagination).toBeUndefined();
  });

  it('emits a pagination envelope when provided', async () => {
    const res = respondData([{ id: 'a' }], { page: 2, pageSize: 50, total: 234 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      data: [{ id: 'a' }],
      pagination: { page: 2, pageSize: 50, total: 234 },
    });
  });

  it('honors a caller-supplied status code (e.g. 201 for create)', async () => {
    const res = respondData({ id: 'new' }, undefined, 201);
    expect(res.status).toBe(201);
  });
});

describe('respondError', () => {
  it('emits the unauthorized 401 shape', async () => {
    const res = respondError('unauthorized', 'Missing header', 401);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: 'unauthorized', message: 'Missing header' },
    });
    expect(body.error.details).toBeUndefined();
  });

  it('attaches details for validation errors', async () => {
    const res = respondError('validation_error', 'Body failed schema', 422, {
      fields: [{ path: 'name', message: 'Required' }],
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'validation_error',
        message: 'Body failed schema',
        details: { fields: [{ path: 'name', message: 'Required' }] },
      },
    });
  });
});
