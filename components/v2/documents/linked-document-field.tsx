'use client';

import { RefCombobox } from '@/components/v2/shared/RefCombobox';
import { useWizardParty } from '@/components/v2/shared/forms/wizard-party-context';
import type { RefEntity } from '@/components/v2/shared/ref-combobox-actions';
import { formatMoney } from '@/lib/format-money';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type OpenInvoice, loadOpenInvoicesAction } from './linked-invoices-actions';

export type LinkedInvoiceRow = { invoiceId: string; amount: number; label?: string };
type Picked = { invoiceId: string; label: string; amount: number };

function parseDefault(raw: string | undefined): LinkedInvoiceRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is LinkedInvoiceRow =>
          r && typeof r.invoiceId === 'string' && typeof r.amount === 'number',
      )
      .map((r) => ({
        invoiceId: r.invoiceId,
        amount: Number(r.amount),
        ...(typeof r.label === 'string' && r.label.length > 0 ? { label: r.label } : {}),
      }));
  } catch {
    return [];
  }
}

/**
 * DSL-driven renderer for `field.documentLink`. The form wizard mounts this
 * via V2AutoField when it encounters a `documentLink` field type — no
 * per-page bespoke wiring required.
 *
 * Wires:
 *   - Toggle (default off) — when off the hidden input submits `[]`.
 *   - RefCombobox scoped to the partyId published by WizardPartyContext.
 *   - Read-only amount display next to the picker, sourced from
 *     `loadOpenInvoicesAction` (`amountSource: 'openBalance'`).
 *
 * Engine continues to post via the existing `linkedInvoices` JSON shape;
 * this component only changes WHERE/HOW the JSON gets produced.
 */
export function LinkedDocumentField({
  name,
  refEntity,
  filterByHeaderField,
  amountSource: _amountSource,
  defaultValue,
}: {
  name: string;
  refEntity: RefEntity;
  filterByHeaderField: string;
  amountSource: 'openBalance' | 'total';
  defaultValue?: string;
}) {
  const t = useTranslations('v2_documents.linkedInvoices');
  const locale = useLocale();
  const { partyId } = useWizardParty();

  // DSL declares `filterByHeaderField`; the wizard publishes the picked
  // customer/supplier id under WizardPartyContext.partyId. This component
  // currently only honours that single party slot — if a future DSL wants
  // to filter on a non-customer/supplier field, the context should grow.
  void filterByHeaderField;

  const partyType: 'customer' | 'supplier' =
    refEntity === 'purchase-invoice' ? 'supplier' : 'customer';

  const initialRows = parseDefault(defaultValue);
  const [picked, setPicked] = useState<Picked | null>(() =>
    initialRows[0]
      ? {
          invoiceId: initialRows[0].invoiceId,
          label: initialRows[0].label ?? initialRows[0].invoiceId.slice(0, 8),
          amount: initialRows[0].amount,
        }
      : null,
  );
  const [enabled, setEnabled] = useState<boolean>(initialRows.length > 0);
  const [open, setOpen] = useState<OpenInvoice[]>([]);

  useEffect(() => {
    let alive = true;
    if (!partyId || !enabled) {
      setOpen([]);
      return () => {
        alive = false;
      };
    }
    loadOpenInvoicesAction(partyType, partyId)
      .then((rs) => {
        if (alive) setOpen(rs);
      })
      .catch(() => {
        if (alive) setOpen([]);
      });
    return () => {
      alive = false;
    };
  }, [partyType, partyId, enabled]);

  function handlePick(id: string | null, label: string | null) {
    if (!id || !label) {
      setPicked(null);
      return;
    }
    const meta = open.find((o) => o.invoiceId === id);
    setPicked({ invoiceId: id, label, amount: meta?.balance ?? 0 });
  }

  const submittedRows: LinkedInvoiceRow[] =
    enabled && picked ? [{ invoiceId: picked.invoiceId, amount: picked.amount }] : [];

  return (
    <div className="v2-linked-control">
      <input type="hidden" name={name} value={JSON.stringify(submittedRows)} />
      <button
        id={`${name}-toggle`}
        type="button"
        className={`v2-toggle-switch${enabled ? ' on' : ''}`}
        onClick={() => setEnabled((v) => !v)}
        aria-label={t('title')}
        aria-pressed={enabled}
      />
      {enabled && partyId ? (
        <>
          <div className="v2-linked-picker">
            <RefCombobox
              name={`__${name}_picker`}
              entity={refEntity}
              filter={{ byParty: partyId }}
              placeholder={t('picker.placeholder')}
              value={picked ? { id: picked.invoiceId, label: picked.label } : null}
              onChange={(id, option) => handlePick(id, option?.label ?? null)}
            />
          </div>
          {picked ? (
            <span className="v2-linked-amount">{formatMoney(picked.amount, locale)}</span>
          ) : null}
        </>
      ) : enabled && !partyId ? (
        <span className="v2-linked-empty-inline">{t('pickPartyFirst')}</span>
      ) : null}
    </div>
  );
}
