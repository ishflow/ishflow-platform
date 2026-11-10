import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, pageOffset, pageRange, parsePage, totalPages } from './pagination';

describe('parsePage', () => {
  it('defaults to 1 for undefined/invalid/zero/negative', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-3')).toBe(1);
  });
  it('parses valid page numbers', () => {
    expect(parsePage('5')).toBe(5);
    expect(parsePage(['7', '9'])).toBe(7); // first element of array param
  });
});

describe('totalPages', () => {
  it('is at least 1 even for zero rows', () => {
    expect(totalPages(0)).toBe(1);
  });
  it('ceils to cover the remainder', () => {
    expect(totalPages(50)).toBe(1);
    expect(totalPages(51)).toBe(2);
    expect(totalPages(1184, 50)).toBe(24);
  });
});

describe('pageOffset', () => {
  it('is zero on page 1 and never negative', () => {
    expect(pageOffset(1)).toBe(0);
    expect(pageOffset(0)).toBe(0);
    expect(pageOffset(3, 50)).toBe(100);
  });
});

describe('pageRange', () => {
  it('is 0–0 when empty', () => {
    expect(pageRange(1, 50, 0)).toEqual({ from: 0, to: 0 });
  });
  it('computes inclusive range and clamps the last page', () => {
    expect(pageRange(1, 50, 1184)).toEqual({ from: 1, to: 50 });
    expect(pageRange(2, 50, 1184)).toEqual({ from: 51, to: 100 });
    expect(pageRange(24, 50, 1184)).toEqual({ from: 1151, to: 1184 });
  });
});

it('exposes a sane default page size', () => {
  expect(DEFAULT_PAGE_SIZE).toBe(50);
});
