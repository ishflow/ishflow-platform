import { ProductListTable } from './product-list-table';
import { ProductOrganizerTree } from './product-organizer-tree';

export type ProductListRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  group: string;
  deletedAt: string | null;
};

export type NodeItem = {
  id: string;
  label: string;
  count: number;
};

export function ProductList({
  rows,
  total,
  allActiveTotal,
  archivedTotal,
  categories,
  groups,
  activeCategory,
  activeGroup,
  activeStatus,
  activeSort,
  activeDir,
  search,
  page,
  pageSize,
}: {
  rows: ProductListRow[];
  total: number;
  allActiveTotal: number;
  archivedTotal: number;
  categories: NodeItem[];
  groups: NodeItem[];
  activeCategory: string | null;
  activeGroup: string | null;
  activeStatus: string | null;
  activeSort?: string | null;
  activeDir?: 'asc' | 'desc';
  search: string;
  page: number;
  pageSize: number;
}) {
  return (
    <div className="organizer organizer--list-first">
      <ProductListTable
        rows={rows}
        total={total}
        search={search}
        page={page}
        pageSize={pageSize}
        activeCategory={activeCategory}
        activeGroup={activeGroup}
        activeStatus={activeStatus}
        activeSort={activeSort ?? null}
        activeDir={activeDir ?? 'desc'}
      />
      <ProductOrganizerTree
        totalCount={allActiveTotal}
        archivedCount={archivedTotal}
        categories={categories}
        groups={groups}
        activeCategory={activeCategory}
        activeGroup={activeGroup}
        activeStatus={activeStatus}
      />
    </div>
  );
}
