import type { RegisterMatrixPayload } from '@/platform/metadata';
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { V2RegisterMatrix } from './register-matrix';

const samplePayload: RegisterMatrixPayload = {
  columns: [
    { id: 'c-cost', code: 'CST', title: 'Maliyet', locked: true, defaultVisible: true },
    { id: 'c-list', code: 'PRC', title: 'Liste', locked: true, defaultVisible: true },
    { id: 'c-vip', code: 'VIP', title: 'VIP', locked: false, defaultVisible: false },
  ],
  rows: [
    { id: 'p1', title: 'Galaxy S24', subtitle: 'SKU-0001' },
    { id: 'p2', title: 'iPhone 17', subtitle: 'SKU-0002' },
  ],
  cells: [
    [
      { formatted: '$1,100.00', tag: 'cost' },
      { formatted: '$1,300.00' },
      { formatted: '$1,950.00', tag: 'l2' },
    ],
    [{ formatted: '$1,900.00', tag: 'cost' }, { formatted: '$2,220.00' }, { formatted: null }],
  ],
};

const i18n = {
  productColumnLabel: 'Ürün',
  emptyTitle: 'Henüz fiyat yok',
  emptySubtitle: 'Fiyat Belirleme belgesi oluştur',
};

describe('V2RegisterMatrix', () => {
  it('renders only locked + visible-coded columns', () => {
    render(<V2RegisterMatrix payload={samplePayload} visibleCodes={['CST', 'PRC']} i18n={i18n} />);
    // Locked CST + PRC visible; VIP not in visibleCodes and unlocked → hidden.
    expect(screen.getByText('Maliyet')).toBeTruthy();
    expect(screen.getByText('Liste')).toBeTruthy();
    expect(screen.queryByText('VIP')).toBeNull();
  });

  it('always renders locked columns regardless of visibleCodes', () => {
    render(<V2RegisterMatrix payload={samplePayload} visibleCodes={[]} i18n={i18n} />);
    expect(screen.getByText('Maliyet')).toBeTruthy();
    expect(screen.getByText('Liste')).toBeTruthy();
  });

  it('renders unlocked columns when their code is in visibleCodes', () => {
    render(
      <V2RegisterMatrix payload={samplePayload} visibleCodes={['CST', 'PRC', 'VIP']} i18n={i18n} />,
    );
    expect(screen.getByText('VIP')).toBeTruthy();
  });

  it('renders cell tags', () => {
    const { container } = render(
      <V2RegisterMatrix payload={samplePayload} visibleCodes={['CST', 'PRC', 'VIP']} i18n={i18n} />,
    );
    expect(container.querySelector('.l2.l2-cost')).toBeTruthy();
    expect(container.querySelector('.l2:not(.l2-cost)')).toBeTruthy();
  });

  it('renders empty state when rows is empty', () => {
    const empty: RegisterMatrixPayload = { ...samplePayload, rows: [], cells: [] };
    render(<V2RegisterMatrix payload={empty} visibleCodes={['CST']} i18n={i18n} />);
    expect(screen.getByText('Henüz fiyat yok')).toBeTruthy();
  });

  it('shows "—" for null cells', () => {
    render(
      <V2RegisterMatrix payload={samplePayload} visibleCodes={['CST', 'PRC', 'VIP']} i18n={i18n} />,
    );
    // iPhone 17 / VIP cell is null
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders pill-danger when cell tag is zero', () => {
    const payload: RegisterMatrixPayload = {
      columns: [{ id: 'c', code: 'C', title: 'C', locked: true, defaultVisible: true }],
      rows: [{ id: 'r', title: 'R' }],
      cells: [[{ formatted: '0', tag: 'zero' }]],
    };
    const { container } = render(
      <V2RegisterMatrix payload={payload} visibleCodes={['C']} i18n={i18n} />,
    );
    const pill = container.querySelector('.pill.pill-danger');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toBe('0');
  });

  it('renders pill-warning when cell tag is low', () => {
    const payload: RegisterMatrixPayload = {
      columns: [{ id: 'c', code: 'C', title: 'C', locked: true, defaultVisible: true }],
      rows: [{ id: 'r', title: 'R' }],
      cells: [[{ formatted: '3', tag: 'low' }]],
    };
    const { container } = render(
      <V2RegisterMatrix payload={payload} visibleCodes={['C']} i18n={i18n} />,
    );
    const pill = container.querySelector('.pill.pill-warning');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toBe('3');
  });
});
