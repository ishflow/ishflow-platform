'use client';

import type { CatalogConfig, Locale } from '@/platform/metadata';
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ActionResult } from './entity-form';

/**
 * Slim, JSON-safe shape of CatalogConfig threaded across the
 * server/client boundary. Everything in CatalogConfig is already
 * serializable today — this alias documents the contract.
 */
export type SerializableCatalogConfig = CatalogConfig;

type Submit = (targetId: string, values: Record<string, unknown>) => Promise<ActionResult>;

type InlineCreateContextValue = {
  registry: Record<string, SerializableCatalogConfig>;
  locale: Locale;
  submit: Submit;
};

const InlineCreateContext = createContext<InlineCreateContextValue | null>(null);

export function InlineCreateProvider({
  registry,
  locale,
  submit,
  children,
}: {
  registry: Record<string, SerializableCatalogConfig>;
  locale: Locale;
  submit: Submit;
  children: React.ReactNode;
}) {
  const value = useMemo<InlineCreateContextValue>(
    () => ({ registry, locale, submit }),
    [registry, locale, submit],
  );
  return <InlineCreateContext.Provider value={value}>{children}</InlineCreateContext.Provider>;
}

/**
 * Reference-field hook for "+ New" inline creation. Returns null if
 * the provider isn't mounted (e.g. inside a layout-less route) so the
 * inline-create UI degrades gracefully.
 */
export function useInlineCreate() {
  const ctx = useContext(InlineCreateContext);
  const getConfig = useCallback(
    (targetId: string): SerializableCatalogConfig | null => ctx?.registry[targetId] ?? null,
    [ctx],
  );
  const submit = useCallback<Submit>(
    async (targetId, values) => {
      if (!ctx) return { ok: false, formError: 'inlineCreateProviderMissing' };
      return ctx.submit(targetId, values);
    },
    [ctx],
  );
  return {
    enabled: ctx !== null,
    locale: ctx?.locale ?? null,
    getConfig,
    submit,
  } as const;
}
