import { NewsletterUnsubscribeButton } from '@/components/app/super-admin/marketing/newsletter-unsubscribe-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { listNewsletterSubscribers } from '@/platform/super-admin/marketing';
import { Download } from 'lucide-react';
import Link from 'next/link';

export default async function MarketingNewsletterPage() {
  const dict = await getSuperAdminDict();
  const m = dict.marketing.newsletter;
  const subscribers = await listNewsletterSubscribers();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
          <p className="text-sm text-muted-foreground">{m.subtitle}</p>
        </div>
        <Button render={<Link href="/super-admin/marketing/newsletter/export" />}>
          <Download className="mr-2 h-4 w-4" />
          {m.exportCsv}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.columns.email}</TableHead>
                <TableHead>{m.columns.confirmedAt}</TableHead>
                <TableHead>{m.columns.unsubscribedAt}</TableHead>
                <TableHead>{m.columns.source}</TableHead>
                <TableHead>{m.columns.createdAt}</TableHead>
                <TableHead className="text-right">{m.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    {m.empty}
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.email}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {s.confirmedAt
                        ? s.confirmedAt.toISOString().slice(0, 19).replace('T', ' ')
                        : dict.common.dash}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {s.unsubscribedAt ? (
                        <Badge variant="outline">{m.unsubscribed}</Badge>
                      ) : (
                        dict.common.dash
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.source ?? dict.common.dash}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {s.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.unsubscribedAt ? (
                        dict.common.dash
                      ) : (
                        <NewsletterUnsubscribeButton
                          id={s.id}
                          label={m.unsubscribe}
                          confirm={m.unsubscribeConfirm}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
