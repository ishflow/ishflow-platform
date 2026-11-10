'use client';

import { KindBadge } from '@/components/app/kind-badge';
import { PaymentDirectionBadge } from '@/components/app/payment-direction-badge';
import { TabOpenLink } from '@/components/app/tabs/tab-open-link';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

export type DataTableColumn = {
  accessorKey: string;
  header: string;
  variant?:
    | 'default'
    | 'link'
    | 'status-badge'
    | 'datetime'
    | 'money'
    | 'direction'
    | 'kind-arrow'
    | 'ref-name';
  statusLabels?: Record<string, string>;
  /** BCP 47 locale tag used when variant is 'money'. Defaults to 'en'. */
  locale?: string;
  /** ISO 4217 currency code used when variant is 'money'. Omit for no symbol. */
  currency?: string;
  /** Extra CSS class applied to both header and body cells in this column. */
  className?: string;
  /** Tailwind min-width utility class, e.g. 'min-w-[180px]'. Applied to header + body cells. */
  minWidth?: string;
  /** Tailwind max-width utility class, e.g. 'max-w-[260px]'. Applied to header + body cells. */
  maxWidth?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn[];
  rows: T[];
  emptyMessage: string;
  linkBasePath?: string;
  /** Enable row selection. Prepends a checkbox column; header checkbox toggles all rows on the page. */
  selectable?: boolean;
  /** Callback fired with the currently selected row originals whenever selection changes. */
  onSelectionChange?: (selected: T[]) => void;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage,
  linkBasePath,
  selectable = false,
  onSelectionChange,
}: DataTableProps<T>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const locale = useLocale();

  const columnDefs = useMemo<ColumnDef<T>[]>(() => {
    const dataCols = columns.map<ColumnDef<T>>((col, idx) => ({
      accessorKey: col.accessorKey,
      header: col.header,
      meta: { className: col.className, minWidth: col.minWidth, maxWidth: col.maxWidth },
      cell: ({ getValue, row }) => {
        const v = getValue();

        if (col.variant === 'status-badge') {
          const raw = String(v ?? '');
          const label = col.statusLabels?.[raw] ?? raw;
          return <Badge variant={raw === 'POSTED' ? 'default' : 'outline'}>{label}</Badge>;
        }

        if (col.variant === 'datetime') {
          if (v === null || v === undefined) return '—';
          const d = v instanceof Date ? v : new Date(v as string | number);
          if (Number.isNaN(d.getTime())) return String(v);
          const day = d.getDate();
          const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
          const year = d.getFullYear();
          const hours = d.getHours().toString().padStart(2, '0');
          const minutes = d.getMinutes().toString().padStart(2, '0');
          return `${day} ${month} ${year} ${hours}:${minutes}`;
        }

        if (col.variant === 'money') {
          if (v instanceof Date) return '—';
          return formatMoney(
            v as number | string | null | undefined,
            col.locale ?? 'en',
            col.currency,
          );
        }

        if (col.variant === 'direction') {
          if (v !== 'in' && v !== 'out') return '—';
          return <PaymentDirectionBadge direction={v} />;
        }

        if (col.variant === 'kind-arrow') {
          const raw = String(v ?? '');
          const label = col.statusLabels?.[raw] ?? raw;
          return <KindBadge kind={raw} label={label} />;
        }

        if (col.variant === 'ref-name') {
          if (v === null || v === undefined) return '—';
          if (typeof v === 'string') return v;
          if (typeof v === 'object' && 'name' in (v as Record<string, unknown>)) {
            const name = (v as { name?: unknown }).name;
            return typeof name === 'string' && name.length > 0 ? name : '—';
          }
          return '—';
        }

        const rendered =
          v === null || v === undefined
            ? '—'
            : v instanceof Date
              ? v.toLocaleDateString()
              : String(v);

        const isLinkCell = col.variant === 'link' || (col.variant === undefined && idx === 0);
        if (isLinkCell && linkBasePath) {
          const id = (row.original as { id?: string }).id;
          if (id) {
            return (
              <TabOpenLink
                href={`${linkBasePath}/${id}`}
                className="text-foreground hover:text-primary hover:underline"
                tabTitle={String(rendered)}
              >
                {rendered}
              </TabOpenLink>
            );
          }
        }
        return rendered;
      },
    }));

    if (!selectable) return dataCols;

    const selectCol: ColumnDef<T> = {
      id: '__select',
      header: ({ table }) => (
        <div className="w-6">
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => {
              table.toggleAllPageRowsSelected(v === true);
            }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="w-6">
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => {
              row.toggleSelected(v === true);
            }}
          />
        </div>
      ),
      enableSorting: false,
    };
    return [selectCol, ...dataCols];
  }, [columns, linkBasePath, selectable, locale]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: selectable ? { rowSelection } : undefined,
    onRowSelectionChange: selectable ? setRowSelection : undefined,
    enableRowSelection: selectable,
    getRowId: (row, index) => (row as { id?: string }).id ?? `row-${index}`,
    getCoreRowModel: getCoreRowModel(),
  });

  // rowSelection is the real trigger — TanStack's `table` object is stable,
  // so without rowSelection the effect never re-fires. biome's deps-check
  // can't see through the tanstack indirection.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowSelection drives the effect via tanstack table state
  useEffect(() => {
    if (!selectable || !onSelectionChange) return;
    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
    onSelectionChange(selected);
  }, [selectable, onSelectionChange, table, rowSelection]);

  const colSpan = selectable ? columns.length + 1 : columns.length;

  const resolveCellClass = (id: string, meta?: unknown): string | undefined => {
    if (id === '__select') return 'w-10 pr-2';
    const m = meta as { className?: string; minWidth?: string; maxWidth?: string } | undefined;
    return cn(m?.className, m?.minWidth, m?.maxWidth);
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table className="table-auto">
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  data-col={h.column.id}
                  className={resolveCellClass(h.column.id, h.column.columnDef.meta)}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    data-col={cell.column.id}
                    className={cn(
                      'align-top whitespace-normal break-words',
                      resolveCellClass(cell.column.id, cell.column.columnDef.meta),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
