'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from 'next-intl';

export type ColumnMapperProps = {
  headers: string[];
  descriptors: Array<{ key: string; required: boolean; labels: string[] }>;
  mapping: Record<string, string | null>;
  onChange: (next: Record<string, string | null>) => void;
};

const UNMAPPED_VALUE = '__unmapped__';

export function ColumnMapper({ headers, descriptors, mapping, onChange }: ColumnMapperProps) {
  const t = useTranslations('admin.import');

  const handleSelect = (header: string, value: string | null) => {
    onChange({
      ...mapping,
      [header]: value === null || value === UNMAPPED_VALUE ? null : value,
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('sourceColumn')}</TableHead>
          <TableHead>{t('targetField')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {headers.map((header) => {
          const current = mapping[header] ?? UNMAPPED_VALUE;
          return (
            <TableRow key={header}>
              <TableCell className="font-medium">{header}</TableCell>
              <TableCell>
                <Select value={current} onValueChange={(v) => handleSelect(header, v)}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED_VALUE}>{t('fieldUnmapped')}</SelectItem>
                    {descriptors.map((d) => (
                      <SelectItem key={d.key} value={d.key}>
                        <span className="flex items-center gap-2">
                          {d.key}
                          {d.required && (
                            <Badge variant="secondary" className="text-xs">
                              {t('fieldRequired')}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
