'use server';

import { isSupportedCurrency } from '@/lib/currencies';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { hasPermission } from '@/platform/engine/permissions';
import { setSettings } from '@/platform/engine/settings';
import { getSettingsRegistry } from '@/platform/metadata';

export type SettingsSubmitState = { ok: true } | { ok: false; error: string } | null;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Generic settings submit action. Reads the registry for the slug, coerces
 * the FormData entries into a JSON payload (string values pass through; field
 * types like number/boolean/color are coerced based on the DSL config), then
 * upserts via `setSettings`.
 *
 * User-scoped settings (config.scope === 'user') write to user_settings
 * rather than tenant_settings; that path is deferred to Phase 3.
 *
 * Validation:
 *   - number/money: must coerce to a finite number; otherwise dropped (the
 *     persisted row keeps whatever value was there).
 *   - boolean: only checked when the form sends the field — booleans absent
 *     from FormData persist as `false` (the `<input type=hidden>` shim from
 *     the toggle widget ensures the field always shows up).
 *   - color: must match `#rrggbb`; otherwise the whole save errors out so
 *     the user sees a clear failure instead of a silent revert.
 *   - string with enumValues: must be either '' or one of the closed set.
 */
export async function submitSettingsAction(
  slug: string,
  _prev: SettingsSubmitState,
  formData: FormData,
): Promise<SettingsSubmitState> {
  const cfg = getSettingsRegistry().settings.get(slug);
  if (!cfg) return { ok: false, error: 'unknown_settings_slug' };

  if (cfg.scope === 'user') {
    return { ok: false, error: 'user_scope_deferred_to_phase_3' };
  }

  const ctx = await requireTenantContext();
  const payload: Record<string, unknown> = {};

  // For every field declared in the DSL: pull its FormData entry (or absence).
  // Iterating fields rather than formData entries gives us a canonical key set
  // and lets booleans default to false when the form omits them.
  for (const [k, field] of Object.entries(cfg.fields)) {
    if (k.startsWith('__')) continue;
    const raw = formData.get(k);
    if (field.type === 'number' || field.type === 'money') {
      if (raw === null || raw === '') continue;
      const n = Number(raw);
      if (Number.isFinite(n)) payload[k] = n;
    } else if (field.type === 'boolean') {
      payload[k] = raw === 'on' || raw === 'true' || raw === '1';
    } else if (field.type === 'color') {
      if (raw === null || raw === '') continue;
      const hex = String(raw).trim();
      if (!HEX_RE.test(hex)) {
        return { ok: false, error: `invalid_color:${k}` };
      }
      payload[k] = hex.toLowerCase();
    } else if (field.type === 'string' && field.enumValues && field.enumValues.length > 0) {
      const s = String(raw ?? '');
      if (s === '') continue;
      if (!field.enumValues.includes(s)) {
        return { ok: false, error: `invalid_enum:${k}` };
      }
      payload[k] = s;
    } else if (raw !== null) {
      payload[k] = String(raw);
    }
  }

  // `admin.general` mirrors the single operational currency + workspace name
  // onto the tenant row (the source of truth for money formatting). Gate that
  // tenant mutation behind the same permission the page enforces.
  if (slug === 'admin.general' && !hasPermission(ctx.permissions, 'admin.organization:edit')) {
    return { ok: false, error: 'forbidden' };
  }

  try {
    await withTenant(ctx.tenant.id, (tx) => setSettings(tx, ctx.tenant.id, slug, payload));
    if (slug === 'admin.general') {
      const data: { currency?: string; name?: string } = {};
      const ccy = payload.defaultCurrencyCode;
      if (typeof ccy === 'string' && isSupportedCurrency(ccy)) data.currency = ccy;
      const nm = payload.workspaceName;
      if (typeof nm === 'string' && nm.trim()) data.name = nm.trim();
      if (Object.keys(data).length > 0) {
        await withBypass((tx) => tx.tenant.update({ where: { id: ctx.tenant.id }, data }));
      }
    }
    // Record the settings change in the in-app audit log (previously only
    // document mutations were audited — #39).
    await writeAudit(null, ctx, {
      entity: 'tenant.settings',
      entityId: slug,
      action: 'update',
      after: payload,
      source: 'web',
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
