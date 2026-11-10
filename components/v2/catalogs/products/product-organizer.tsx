'use client';

import { Link } from '@/platform/i18n/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  List,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type TreeNode = {
  id: string;
  label: string;
  count: number;
  children?: TreeNode[];
  dim?: boolean;
};

const TREE: TreeNode[] = [
  {
    id: 'elektronik',
    label: 'Elektronik',
    count: 218,
    children: [
      {
        id: 'telefon',
        label: 'Telefon',
        count: 42,
        children: [
          { id: 'samsung', label: 'Samsung', count: 18 },
          { id: 'apple', label: 'Apple', count: 14 },
          { id: 'xiaomi', label: 'Xiaomi', count: 10 },
        ],
      },
      { id: 'bilgisayar', label: 'Bilgisayar', count: 88 },
      { id: 'tablet', label: 'Tablet', count: 24 },
      { id: 'goruntu', label: 'Görüntü', count: 18 },
      { id: 'aksesuar', label: 'Aksesuar', count: 46 },
    ],
  },
  { id: 'beyaz', label: 'Beyaz Eşya', count: 42 },
  { id: 'mobilya', label: 'Mobilya', count: 35 },
  { id: 'aydinlatma', label: 'Aydınlatma', count: 22 },
  { id: 'sarf', label: 'Sarf / Kalem', count: 11 },
  { id: 'kategorisiz', label: 'Kategorisiz', count: 0, dim: true },
];

function TreeBranch({
  node,
  level,
  openIds,
  activeId,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  level: number;
  openIds: Set<string>;
  activeId: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isOpen = openIds.has(node.id);
  const isActive = activeId === node.id;

  return (
    <li>
      <div
        className={`tree-node${isOpen ? ' is-open' : ''}${isActive ? ' is-active' : ''}${node.dim ? ' dim' : ''}`}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(node.id);
            if (hasChildren) onToggle(node.id);
          }
        }}
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={isActive}
      >
        <span className="caret" style={{ visibility: hasChildren ? 'visible' : 'hidden' }}>
          <ChevronRight size={12} strokeWidth={1.75} />
        </span>
        <span className="ico">
          {hasChildren ? (
            isOpen ? (
              <FolderOpen size={14} strokeWidth={1.75} />
            ) : (
              <Folder size={14} strokeWidth={1.75} />
            )
          ) : (
            <Package size={14} strokeWidth={1.75} />
          )}
        </span>
        <span className="lbl">{node.label}</span>
        <span className="cnt">{node.count}</span>
      </div>
      {hasChildren && isOpen && (
        <ul>
          {node.children?.map((c) => (
            <TreeBranch
              key={c.id}
              node={c}
              level={level + 1}
              openIds={openIds}
              activeId={activeId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ProductOrganizer() {
  const t = useTranslations('v2_catalogs.products.organizer');
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(['elektronik', 'telefon']));
  const [activeId, setActiveId] = useState('telefon');
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <>
      <div className="action-bar">
        <div className="left">
          <div className="view-toggle">
            <Link href="/catalogs/products">
              <List size={13} strokeWidth={1.75} />
              {t('viewList')}
            </Link>
            <button type="button" className="is-active">
              <FolderTree size={13} strokeWidth={1.75} />
              {t('viewTree')}
            </button>
          </div>
          <div className="chip-row">
            <button type="button" className="chip is-active">
              {t('chipAll')} <span className="count">328</span>
            </button>
            <button type="button" className="chip">
              {t('chipActive')} <span className="count">305</span>
            </button>
            <button type="button" className="chip">
              {t('chipLowStock')} <span className="count">12</span>
            </button>
            <button type="button" className="chip">
              {t('chipArchive')} <span className="count">11</span>
            </button>
          </div>
        </div>
        <div className="right">
          <button type="button" className="btn btn-secondary btn-sm">
            <Filter size={14} strokeWidth={1.75} />
            {t('filter')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            <Upload size={14} strokeWidth={1.75} />
            {t('bulkImport')}
          </button>
          <Link href="/catalogs/products/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {t('newProduct')}
          </Link>
        </div>
      </div>

      <div className="organizer">
        <section className="card tree-card">
          <div className="tree-toolbar">
            <input
              type="text"
              placeholder={t('categorySearch')}
              aria-label={t('categorySearchAria')}
            />
            <button type="button" className="icon-btn" aria-label={t('newCategoryAria')}>
              <FolderPlus size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className="tree" role="tree">
            <ul>
              {TREE.map((n) => (
                <TreeBranch
                  key={n.id}
                  node={n}
                  level={0}
                  openIds={openIds}
                  activeId={activeId}
                  onToggle={toggle}
                  onSelect={setActiveId}
                />
              ))}
            </ul>
          </div>
        </section>

        <section className="table-card" style={{ margin: 0 }}>
          <div className="table-toolbar">
            <div className="left">
              <strong style={{ fontSize: 13 }}>Telefon</strong>
              <span className="dim" style={{ fontSize: 12 }}>
                {t('productsCount', { count: 42 })}
              </span>
            </div>
            <div className="right">
              <div className="search-input">
                <Search size={14} strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder={t('tableSearch')}
                  aria-label={t('tableSearchAria')}
                />
              </div>
            </div>
          </div>

          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <span className="checkbox" />
                </th>
                <th>{t('colSku')}</th>
                <th>{t('colName')}</th>
                <th>{t('colBrand')}</th>
                <th className="num">{t('colStock')}</th>
                <th className="num">{t('colPrice')}</th>
                <th className="num">{t('colCost')}</th>
                <th className="num">{t('colMargin')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[
                {
                  sku: 'SKU-0001',
                  name: 'Samsung Galaxy S24',
                  spec: '256GB',
                  brand: 'Samsung',
                  stock: 200,
                  low: false,
                  price: '$1,300.00',
                  cost: '$1,100.00',
                  margin: '+15.4%',
                },
                {
                  sku: 'SKU-0002',
                  name: 'iPhone 17 Pro Max',
                  spec: '512GB',
                  brand: 'Apple',
                  stock: 300,
                  low: false,
                  price: '$2,220.00',
                  cost: '$1,900.00',
                  margin: '+14.4%',
                },
                {
                  sku: 'SKU-0018',
                  name: 'Xiaomi 14 Ultra',
                  spec: '512GB',
                  brand: 'Xiaomi',
                  stock: 60,
                  low: false,
                  price: '$1,050.00',
                  cost: '$820.00',
                  margin: '+28.0%',
                },
                {
                  sku: 'SKU-0024',
                  name: 'Samsung A55',
                  spec: '128GB',
                  brand: 'Samsung',
                  stock: 450,
                  low: false,
                  price: '$420.00',
                  cost: '$320.00',
                  margin: '+31.2%',
                },
                {
                  sku: 'SKU-0031',
                  name: 'iPhone 16 mini',
                  spec: '128GB',
                  brand: 'Apple',
                  stock: 9,
                  low: true,
                  price: '$899.00',
                  cost: '$700.00',
                  margin: '+28.4%',
                },
                {
                  sku: 'SKU-0044',
                  name: 'Samsung Z Fold 6',
                  spec: '1TB',
                  brand: 'Samsung',
                  stock: 35,
                  low: false,
                  price: '$1,880.00',
                  cost: '$1,500.00',
                  margin: '+25.3%',
                },
                {
                  sku: 'SKU-0052',
                  name: 'Xiaomi Redmi Note 13',
                  spec: '256GB',
                  brand: 'Xiaomi',
                  stock: 240,
                  low: false,
                  price: '$310.00',
                  cost: '$220.00',
                  margin: '+40.9%',
                },
              ].map((r) => (
                <tr key={r.sku}>
                  <td>
                    <span className="checkbox" />
                  </td>
                  <td className="mono">
                    <Link href={`/catalogs/products/${r.sku}`}>{r.sku}</Link>
                  </td>
                  <td>
                    <div className="row-title">{r.name}</div>
                    <div className="row-sub">{r.spec}</div>
                  </td>
                  <td>{r.brand}</td>
                  <td className="num">
                    {r.low ? <span className="pill pill-warning">{r.stock}</span> : r.stock}
                  </td>
                  <td className="num">{r.price}</td>
                  <td className="num">{r.cost}</td>
                  <td className="num">
                    <span className="pill pill-success">{r.margin}</span>
                  </td>
                  <td>
                    <button type="button" className="row-menu" aria-label={t('rowActionsAria')}>
                      <MoreHorizontal size={14} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <div>{t('showing', { from: 1, to: 7, total: 42 })}</div>
            <div className="pager">
              <span className="pg">
                <ChevronLeft size={12} strokeWidth={1.75} />
              </span>
              <span className="pg is-active">1</span>
              <span className="pg">2</span>
              <span className="pg">3</span>
              <span className="pg">
                <ChevronRight size={12} strokeWidth={1.75} />
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
