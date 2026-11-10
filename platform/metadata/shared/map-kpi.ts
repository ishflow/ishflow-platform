import type { Locale, LocalizedLabel } from '../types';
import { pickLabel } from './pick-label';

/**
 * Locale-aware KPI input — shared by register-view and report-view DSLs.
 */
export type SharedKpiInput = {
  label: LocalizedLabel;
  value: string;
  delta?: {
    direction: 'up' | 'down';
    formatted: string;
    note: LocalizedLabel;
  };
  tone?: 'positive' | 'negative' | 'neutral';
};

/**
 * Visual KPI item consumed by `V2DataKpiStrip`.
 */
export type SharedKpiOutput = {
  label: string;
  value: string;
  change?: string;
  note?: string;
  tone: 'up' | 'down' | 'neutral';
};

export function mapKpi(k: SharedKpiInput, locale: Locale | string): SharedKpiOutput {
  const label = pickLabel(k.label, locale);
  if (!k.delta) {
    return {
      label,
      value: k.value,
      tone: k.tone === 'positive' ? 'up' : k.tone === 'negative' ? 'down' : 'neutral',
    };
  }
  return {
    label,
    value: k.value,
    change: k.delta.formatted,
    note: pickLabel(k.delta.note, locale),
    tone: k.delta.direction,
  };
}
