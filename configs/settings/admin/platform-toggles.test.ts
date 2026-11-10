import { getSettingsRegistry } from '@/platform/metadata/settings';
import { describe, expect, it } from 'vitest';
import './platform-toggles';

describe('configs/settings/admin/platform-toggles', () => {
  it('exposes 10 boolean toggles across 3 groups', () => {
    const cfg = getSettingsRegistry().settings.get('admin.platform_toggles');
    expect(cfg).toBeDefined();
    const fields = Object.values(cfg?.fields ?? {});
    expect(fields).toHaveLength(10);
    for (const f of fields) {
      expect(f.type).toBe('boolean');
      expect(['core', 'integrations', 'advanced']).toContain(f.group);
    }
  });
});
