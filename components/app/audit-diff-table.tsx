import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DiffRow } from '@/lib/audit/diff';
import { useTranslations } from 'next-intl';

function renderCell(v: unknown) {
  if (v === undefined) return <span className="text-muted-foreground">—</span>;
  if (v === null) return <span className="italic text-muted-foreground">null</span>;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return <code className="text-xs">{JSON.stringify(v)}</code>;
}

export function AuditDiffTable({ rows }: { rows: DiffRow[] }) {
  const t = useTranslations('admin.audit');
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t('noChanges')}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('field')}</TableHead>
          <TableHead>{t('diff.before')}</TableHead>
          <TableHead>{t('diff.after')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.field}>
            <TableCell className="font-medium">{r.field}</TableCell>
            <TableCell>{renderCell(r.before)}</TableCell>
            <TableCell>{renderCell(r.after)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
