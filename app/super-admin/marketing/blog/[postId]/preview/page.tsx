import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { getBlogPost } from '@/platform/super-admin/marketing';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ postId: string }>;
}

/**
 * Minimal MDX preview — renders the body as preformatted markdown text.
 * The public site is expected to render this through a real MDX pipeline;
 * the editor preview only needs to show the operator what they typed in
 * a readable shape, so we wrap the body in a `<pre>` while keeping the
 * frontmatter (title / excerpt) visible above. This avoids pulling in a
 * heavy MDX bundle just for the editor.
 */
export default async function PreviewBlogPostPage({ params }: PageProps) {
  const { postId } = await params;
  const post = await getBlogPost(postId);
  if (!post) notFound();

  const dict = await getSuperAdminDict();
  const m = dict.marketing.blog;

  const translations = post.translations;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/super-admin/marketing/blog/${post.id}`} />}
        >
          {m.edit.backToList}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.preview.title} · {post.slug}
        </h1>
      </header>

      {translations.length === 0 || !translations[0] ? (
        <p className="text-sm text-muted-foreground">{m.preview.empty}</p>
      ) : (
        <Tabs defaultValue={translations[0].locale}>
          <TabsList>
            {translations.map((t) => (
              <TabsTrigger key={t.locale} value={t.locale} className="uppercase">
                {t.locale}
              </TabsTrigger>
            ))}
          </TabsList>
          {translations.map((t) => (
            <TabsContent key={t.locale} value={t.locale} className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">{t.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t.excerpt}</p>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm">
                    {t.body}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
