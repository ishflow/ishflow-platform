import '@/configs';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { getDashboardRegistry } from '@/platform/metadata';
import { getLocale, getTranslations } from 'next-intl/server';
import { Fragment, type ReactNode } from 'react';
import { DASHBOARD_RENDERERS } from './renderers';

function widgetAllowed(perms: Set<string>, requires?: string | string[]): boolean {
  if (!requires) return true;
  const list = Array.isArray(requires) ? requires : [requires];
  return list.some((p) => hasPermission(perms, p));
}

/**
 * Generic dashboard shell. Reads the registered widget map + order
 * config, runs every loader in parallel under the tenant context, then
 * matches each widget's renderer id to a server component that
 * resolves payload → props for the existing client components.
 */
export async function renderV2Dashboard() {
  const t = await getTranslations('v2_dashboard');
  const locale = await getLocale();

  let tenantId = '';
  let currency = 'USD';
  let perms = new Set<string>();
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    currency = ctx.tenant?.currency ?? 'USD';
    perms = ctx.permissions;
  } catch {
    // Unauthenticated — widgets render with empty payloads.
  }

  const { widgets, order } = getDashboardRegistry();
  const widgetCtx = { tenant: { id: tenantId, locale, currency } };

  // Permission-gate widgets so a role only sees (and only loads the data for)
  // widgets it may view — e.g. a warehouse clerk gets no financial KPIs.
  const allowedIds = new Set(
    Array.from(widgets.values())
      .filter((w) => widgetAllowed(perms, w.requires))
      .map((w) => w.id),
  );

  const payloads = new Map<string, unknown>();
  await Promise.all(
    Array.from(widgets.values())
      .filter((w) => allowedIds.has(w.id))
      .map(async (w) => {
        try {
          payloads.set(w.id, await w.loader(widgetCtx));
        } catch (err) {
          // Don't fail the whole dashboard on one widget — log + render
          // empty so engineers see a signal in server logs.
          console.error('[v2-dashboard] widget loader failed', w.id, err);
          payloads.set(w.id, null);
        }
      }),
  );

  async function renderOne(id: string): Promise<ReactNode> {
    const widget = widgets.get(id);
    if (!widget || !allowedIds.has(id)) return null;
    const Renderer = DASHBOARD_RENDERERS[widget.renderer];
    if (!Renderer) return null;
    const node = await Renderer({ payload: payloads.get(id) ?? null, locale, currency });
    return <Fragment key={id}>{node}</Fragment>;
  }

  const slots = order ?? Array.from(widgets.keys());

  const rendered = await Promise.all(
    slots.map(async (slot) => {
      if (Array.isArray(slot)) {
        const inner = await Promise.all(slot.map((id) => renderOne(id)));
        return (
          <section
            key={`row-${slot.join('-')}`}
            className="grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
          >
            {inner}
          </section>
        );
      }
      return renderOne(slot);
    }),
  );

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">{rendered}</div>
    </>
  );
}
