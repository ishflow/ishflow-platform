'use client';

import { useContext } from 'react';
import { TabsContext, type TabsContextValue } from './tabs-context';

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used within a <TabsProvider>');
  return ctx;
}

/** Non-throwing variant for code paths that run both inside and outside the shell (e.g. mobile). */
export function useTabsOptional(): TabsContextValue | null {
  return useContext(TabsContext);
}
