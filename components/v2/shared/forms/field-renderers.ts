import type { CustomFieldConfig } from '@/platform/metadata';
import type { ComponentType } from 'react';

export type CustomFieldRendererProps = {
  field: CustomFieldConfig;
  /**
   * Current value at field.source (or the full record when source is omitted).
   * Renderer interprets per its own contract.
   */
  value: unknown;
  /** Record ID under edit, or null on create. */
  recordId: string | null;
  /** view | edit — view is read-only display, edit allows mutation. */
  mode: 'view' | 'edit';
};

export const FIELD_RENDERERS: Record<string, ComponentType<CustomFieldRendererProps>> = {};

export function registerFieldRenderer(
  key: string,
  Component: ComponentType<CustomFieldRendererProps>,
): void {
  FIELD_RENDERERS[key] = Component;
}

export function getFieldRenderer(key: string): ComponentType<CustomFieldRendererProps> | null {
  return FIELD_RENDERERS[key] ?? null;
}
