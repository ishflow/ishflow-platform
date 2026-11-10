import { BlogEditor } from '@/components/app/super-admin/marketing/blog-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getBlogPost } from '@/platform/super-admin/marketing';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ postId: string }>;
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { postId } = await params;
  const post = await getBlogPost(postId);
  if (!post) notFound();

  const dict = await getSuperAdminDict();
  const m = dict.marketing.blog;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button variant="ghost" size="sm" render={<Link href="/super-admin/marketing/blog" />}>
          {m.edit.backToList}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{post.slug}</h1>
            <p className="text-sm text-muted-foreground">
              {post.authorName} · {post.tags.length > 0 ? post.tags.join(', ') : '—'}
            </p>
          </div>
          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
            {m.statusLabels[post.status]}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.edit.translations}</CardTitle>
        </CardHeader>
        <CardContent>
          <BlogEditor
            postId={post.id}
            slug={post.slug}
            status={post.status}
            authorName={post.authorName}
            tags={post.tags}
            heroImageUrl={post.heroImageUrl}
            translations={post.translations}
            dict={dict.marketing}
            saveLabel={dict.common.save}
          />
        </CardContent>
      </Card>
    </div>
  );
}
