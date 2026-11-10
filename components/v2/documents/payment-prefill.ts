/**
 * Parse the "?customer=…&invoice=…&amount=…" query string that invoice list
 * rows attach to their "new payment" shortcuts, and turn it into the
 * `defaultValues + refDefaults` shape `renderV2DocumentNew` consumes.
 *
 * `party` selects which keyset to read: customer/customerName for A/R
 * (payment-received), supplier/supplierName for A/P (payment-sent).
 *
 * Returns `undefined` when no usable triple is present, so the wizard renders
 * empty as before.
 */
export type PaymentPrefill = {
  defaultValues: Record<string, unknown>;
  refDefaults: Record<string, { id: string; label: string } | null>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pickString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function buildPaymentPrefill({
  searchParams,
  party,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  party: 'customer' | 'supplier';
}): Promise<PaymentPrefill | undefined> {
  const partyId = pickString(searchParams[party]);
  const partyName = pickString(searchParams[`${party}Name`]);
  const invoiceId = pickString(searchParams.invoice);
  const invoiceNumber = pickString(searchParams.invoiceNumber);
  const amountRaw = pickString(searchParams.amount);

  if (!partyId || !invoiceId || !amountRaw) return undefined;
  if (!UUID_RE.test(partyId) || !UUID_RE.test(invoiceId)) return undefined;

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const linkedInvoices = JSON.stringify([
    {
      invoiceId,
      amount,
      ...(invoiceNumber ? { label: invoiceNumber } : {}),
    },
  ]);

  const partyLabel = partyName ?? partyId.slice(0, 8);

  return {
    defaultValues: {
      [party]: partyId,
      linkedInvoices,
      amount: amount.toFixed(2),
    },
    refDefaults: {
      [party]: { id: partyId, label: partyLabel },
    },
  };
}
