import { describe, expect, it } from 'vitest';
import './repricing';
import { getRegistry } from '@/platform/metadata';

describe('inventory.repricing document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['inventory.repricing']).toBeDefined();
  });

  it('writes NO register movements (audit trail only)', () => {
    const cfg = getRegistry().document['inventory.repricing'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('hides workflowStatus from forms', () => {
    const ws = getRegistry().document['inventory.repricing']?.header?.workflowStatus;
    expect(ws?.type).toBe('string');
    if (ws?.type === 'string') {
      expect(ws.formHidden).toBe(true);
      expect(ws.maxLength).toBe(32);
    }
  });

  it('items section: product + oldCost + newCost REQUIRED, both money', () => {
    const items = getRegistry().document['inventory.repricing']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBe(true);
    const oc = items?.fields?.oldCost;
    expect(oc?.type).toBe('money');
    expect(oc?.required).toBe(true);
    const nc = items?.fields?.newCost;
    expect(nc?.type).toBe('money');
    expect(nc?.required).toBe(true);
  });
});
