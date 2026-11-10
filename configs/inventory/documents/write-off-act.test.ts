import { describe, expect, it } from 'vitest';
import './write-off-act';
import { getRegistry } from '@/platform/metadata';

describe('inventory.write_off_act document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['inventory.write_off_act']).toBeDefined();
  });

  it('writes NO register movements (audit record, stock leaves via sibling adjustment)', () => {
    const cfg = getRegistry().document['inventory.write_off_act'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('constrains reasonCode to the documented enum', () => {
    const rc = getRegistry().document['inventory.write_off_act']?.header?.reasonCode;
    expect(rc?.type).toBe('string');
    if (rc?.type === 'string') {
      expect(rc.maxLength).toBe(32);
      expect(rc.enumValues).toEqual(['damage', 'loss', 'expired', 'internal_use', 'other']);
    }
  });

  it('hides workflowStatus from forms', () => {
    const ws = getRegistry().document['inventory.write_off_act']?.header?.workflowStatus;
    expect(ws?.type).toBe('string');
    if (ws?.type === 'string') {
      expect(ws.formHidden).toBe(true);
      expect(ws.maxLength).toBe(32);
    }
  });

  it('items section: product + quantity REQUIRED, no money fields', () => {
    const items = getRegistry().document['inventory.write_off_act']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBe(true);
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price).toBeUndefined();
  });
});
