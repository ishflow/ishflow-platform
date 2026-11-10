'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ErrorList({ errors }: { errors: Array<{ row: number; message: string }> }) {
  const t = useTranslations('admin.import');

  const downloadCsv = () => {
    const header = 'row,message\n';
    const body = errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t('errorsTitle')}</p>
        <Button type="button" variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="h-4 w-4" aria-hidden />
          {t('downloadErrors')}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead>{t('errorsTitle')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((e) => (
              <TableRow key={`${e.row}-${e.message}`}>
                <TableCell>{e.row}</TableCell>
                <TableCell className="text-destructive">{e.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
