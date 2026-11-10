export type AvailableCurrency = { code: string; name: string; symbol: string };

export type BulkAddCurrenciesResult =
  | { ok: true; addedCount: number }
  | { ok: false; formError: string };
