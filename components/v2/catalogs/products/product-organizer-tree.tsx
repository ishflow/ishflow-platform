import { Link } from '@/platform/i18n/navigation';
import { Archive, CheckCircle, Folder, Layers, Package } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type NodeItem = {
  id: string;
  label: string;
  count: number;
};

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '' || v === 0) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function ProductOrganizerTree({
  totalCount,
  archivedCount,
  categories,
  groups,
  activeCategory,
  activeGroup,
  activeStatus,
}: {
  totalCount: number;
  archivedCount: number;
  categories: NodeItem[];
  groups: NodeItem[];
  activeCategory: string | null;
  activeGroup: string | null;
  activeStatus: string | null;
}) {
  const t = await getTranslations('v2_catalogs.products.list');
  const tc = await getTranslations('v2_catalogs.common');

  const noFilter =
    !activeCategory && !activeGroup && (activeStatus === null || activeStatus === 'active');

  return (
    <aside className="org-tree">
      <Link href="/catalogs/products" className={`org-tree-item${noFilter ? ' is-active' : ''}`}>
        <Package size={14} strokeWidth={1.75} />
        {t('allProducts')}
        <span className="count">{totalCount}</span>
      </Link>

      {categories.length > 0 && (
        <div className="org-tree-section">
          <div className="org-tree-title">{t('categoriesSection')}</div>
          {categories.map((c) => {
            const isActive = activeCategory === c.id;
            const href = `/catalogs/products${buildQuery({
              cat: isActive ? null : c.id,
              group: activeGroup,
              status: activeStatus === 'active' ? null : activeStatus,
            })}`;
            return (
              <Link
                key={c.id}
                href={href}
                className={`org-tree-item${isActive ? ' is-active' : ''}`}
              >
                <Folder size={14} strokeWidth={1.75} />
                {c.label}
                <span className="count">{c.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {groups.length > 0 && (
        <div className="org-tree-section">
          <div className="org-tree-title">{t('groupsSection')}</div>
          {groups.map((g) => {
            const isActive = activeGroup === g.id;
            const href = `/catalogs/products${buildQuery({
              cat: activeCategory,
              group: isActive ? null : g.id,
              status: activeStatus === 'active' ? null : activeStatus,
            })}`;
            return (
              <Link
                key={g.id}
                href={href}
                className={`org-tree-item${isActive ? ' is-active' : ''}`}
              >
                <Layers size={14} strokeWidth={1.75} />
                {g.label}
                <span className="count">{g.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="org-tree-section">
        <div className="org-tree-title">{tc('status')}</div>
        <Link
          href={`/catalogs/products${buildQuery({
            cat: activeCategory,
            group: activeGroup,
          })}`}
          className={`org-tree-item${activeStatus === null || activeStatus === 'active' ? ' is-active' : ''}`}
        >
          <CheckCircle size={14} strokeWidth={1.75} />
          {tc('active')}
          <span className="count">{totalCount}</span>
        </Link>
        <Link
          href={`/catalogs/products${buildQuery({
            cat: activeCategory,
            group: activeGroup,
            status: 'archived',
          })}`}
          className={`org-tree-item${activeStatus === 'archived' ? ' is-active' : ''}`}
        >
          <Archive size={14} strokeWidth={1.75} />
          {tc('archived')}
          <span className="count">{archivedCount}</span>
        </Link>
      </div>
    </aside>
  );
}
