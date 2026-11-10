import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  TopCustomerRow,
  TopProductRow,
} from '@/platform/super-admin/analytics/top-aggregates';

interface TopProductsCardProps {
  rows: TopProductRow[];
  dict: {
    title: string;
    description: string;
    empty: string;
    columns: { rank: string; product: string; tenants: string; units: string; revenue: string };
  };
}

export function TopProductsCard({ rows, dict }: TopProductsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <CardHeader>
          <CardDescription>{dict.empty}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[6%]">{dict.columns.rank}</TableHead>
              <TableHead>{dict.columns.product}</TableHead>
              <TableHead className="w-[14%] text-right">{dict.columns.tenants}</TableHead>
              <TableHead className="w-[14%] text-right">{dict.columns.units}</TableHead>
              <TableHead>{dict.columns.revenue}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.productHash}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{idx + 1}
                </TableCell>
                <TableCell className="font-mono text-xs text-foreground">{r.productHash}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {r.tenants}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {r.units}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {Object.entries(r.revenueByCurrency).map(([cur, val]) => (
                    <span key={cur} className="mr-2 inline-block">
                      {cur} {val.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

interface TopCustomersCardProps {
  rows: TopCustomerRow[];
  dict: {
    title: string;
    description: string;
    empty: string;
    columns: { rank: string; customer: string; invoices: string; revenue: string };
  };
}

export function TopCustomersCard({ rows, dict }: TopCustomersCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <CardHeader>
          <CardDescription>{dict.empty}</CardDescription>
        </CardHeader>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[6%]">{dict.columns.rank}</TableHead>
              <TableHead>{dict.columns.customer}</TableHead>
              <TableHead className="w-[18%] text-right">{dict.columns.invoices}</TableHead>
              <TableHead className="w-[24%] text-right">{dict.columns.revenue}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.customerHash}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{idx + 1}
                </TableCell>
                <TableCell className="font-mono text-xs text-foreground">
                  {r.customerHash}
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {r.invoices}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {Object.entries(r.revenueByCurrency).map(([cur, val]) => (
                    <span key={cur} className="ml-2 inline-block">
                      {cur} {val.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
