'use client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type PermissionMatrixProps = {
  allPermissions: string[];
  granted: Set<string>;
  onToggle: (code: string, next: boolean) => void;
  readOnly?: boolean;
};

const ACTIONS = ['read', 'write', 'delete', 'post', 'unpost'] as const;

export function PermissionMatrix({
  allPermissions,
  granted,
  onToggle,
  readOnly,
}: PermissionMatrixProps) {
  const t = useTranslations('admin.roles.permission');
  const entities = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const code of allPermissions) {
      const [entity, action] = code.split(':');
      if (!entity || !action) continue;
      if (!map.has(entity)) map.set(entity, new Set());
      map.get(entity)?.add(action);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Entity</TableHead>
          {ACTIONS.map((a) => (
            <TableHead key={a} className="text-center">
              {t(a)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entities.map(([entity, available]) => (
          <TableRow key={entity}>
            <TableCell className="font-mono text-sm">{entity}</TableCell>
            {ACTIONS.map((a) => {
              const code = `${entity}:${a}`;
              const allowed = available.has(a);
              const has =
                granted.has(code) ||
                granted.has(`${entity}:*`) ||
                granted.has('*:*') ||
                granted.has(`*:${a}`);
              return (
                <TableCell key={code} className="text-center">
                  {allowed ? (
                    <Checkbox
                      checked={has}
                      disabled={readOnly}
                      onCheckedChange={(v) => onToggle(code, Boolean(v))}
                      aria-label={code}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
