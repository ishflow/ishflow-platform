import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

import { createBlogPostAction } from '@/app/super-admin/marketing/_actions/blog';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';

export default async function NewBlogPostPage() {
  const dict = await getSuperAdminDict();
  const m = dict.marketing.blog;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button variant="ghost" size="sm" render={<Link href="/super-admin/marketing/blog" />}>
          {m.edit.backToList}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{m.new.title}</h1>
        <p className="text-sm text-muted-foreground">{m.new.subtitle}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.new.title}</CardTitle>
          <CardDescription>{m.new.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBlogPostAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">{m.new.slug}</Label>
              <Input id="slug" name="slug" required maxLength={120} placeholder="my-blog-post" />
              <p className="text-xs text-muted-foreground">{m.new.slugHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="authorName">{m.new.authorName}</Label>
              <Input id="authorName" name="authorName" required maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">{m.new.tags}</Label>
              <Input id="tags" name="tags" placeholder="release, feature" />
              <p className="text-xs text-muted-foreground">{m.new.tagsHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="heroImageUrl">{m.new.heroImageUrl}</Label>
              <Input id="heroImageUrl" name="heroImageUrl" placeholder="https://" />
            </div>
            <Button type="submit">{m.new.create}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
