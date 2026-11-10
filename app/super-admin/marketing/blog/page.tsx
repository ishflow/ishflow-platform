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
import type { BlogPostStatus } from '@prisma/client';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { listBlogPosts } from '@/platform/super-admin/marketing';

function statusVariant(status: BlogPostStatus): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'published':
      return 'default';
    case 'draft':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default async function MarketingBlogPage() {
  const dict = await getSuperAdminDict();
  const m = dict.marketing.blog;
  const posts = await listBlogPosts();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
          <p className="text-sm text-muted-foreground">{m.subtitle}</p>
        </div>
        <Button render={<Link href="/super-admin/marketing/blog/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          {m.newButton}
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
                <TableHead>{m.columns.slug}</TableHead>
                <TableHead>{m.columns.status}</TableHead>
                <TableHead>{m.columns.author}</TableHead>
                <TableHead>{m.columns.updatedAt}</TableHead>
                <TableHead>{m.columns.publishedAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    {m.empty}
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/super-admin/marketing/blog/${p.id}`}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {p.slug}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{m.statusLabels[p.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{p.authorName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {p.updatedAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {p.publishedAt ? p.publishedAt.toISOString().slice(0, 10) : dict.common.dash}
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
