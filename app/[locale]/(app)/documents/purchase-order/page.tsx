import '@/configs';

import { V2Topbar } from '@/components/v2/shell/topbar';
import { type Locale, getRegistry } from '@/platform/metadata';
import { getLocale } from 'next-intl/server';

/**
 * TODO(phase-2): replace this stub with a real list shell once the
 * generic V2 list renderer lands. For now this page only exists so the
 * slug-map entry resolves and the "/new" wizard can be reached from the
 * side-rail.
 *
 * NOTE: this slug currently sits under `/documents/` because the
 * stub doesn't need the purchases-section frame; a future real list
 * may move it under `/purchases/` and update `listHrefForDocumentSlug`.
 */
export default async function V2PurchaseOrderListPage() {
  const locale = (await getLocale()) as Locale;
  const cfg = getRegistry().document['purchases.order'];
  const label = cfg?.pluralLabel?.[locale] ?? cfg?.pluralLabel?.en ?? 'Purchase Orders';
  const newHref = '/documents/purchase-order/new';

  return (
    <>
      <V2Topbar breadcrumb="Purchases / Orders" title={label} />
      <div className="content">
        <div style={{ padding: '24px' }}>
          <p style={{ color: 'var(--muted-foreground, #888)' }}>
            List view not yet implemented.{' '}
            <a href={newHref} style={{ textDecoration: 'underline' }}>
              Create a new {label.toLowerCase().replace(/s$/, '')}
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
