'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  MARKETING_EDITOR_LOCALES,
  type MarketingEditorLocale,
} from '@/platform/marketing/section-catalog';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import type { BlogPostStatus } from '@prisma/client';
import { Archive, ExternalLink, Save, Send } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  archiveBlogPostAction,
  publishBlogPostAction,
  updateBlogPostAction,
} from '@/app/super-admin/marketing/_actions/blog';

export interface BlogEditorProps {
  postId: string;
  slug: string;
  status: BlogPostStatus;
  authorName: string;
  tags: string[];
  heroImageUrl: string | null;
  translations: Array<{ locale: string; title: string; excerpt: string; body: string }>;
  dict: SuperAdminDict['marketing'];
  saveLabel: string;
  /** Where the Preview button links. Defaults to the locale-free route; V2 CMS overrides it. */
  previewHref?: string;
}

type Translation = { locale: MarketingEditorLocale; title: string; excerpt: string; body: string };

function expandTranslations(
  initial: ReadonlyArray<{ locale: string; title: string; excerpt: string; body: string }>,
): Translation[] {
  const map = new Map(initial.map((t) => [t.locale, t]));
  return MARKETING_EDITOR_LOCALES.map((l) => {
    const existing = map.get(l);
    return existing
      ? { locale: l, title: existing.title, excerpt: existing.excerpt, body: existing.body }
      : { locale: l, title: '', excerpt: '', body: '' };
  });
}

export function BlogEditor(props: BlogEditorProps) {
  const m = props.dict.blog;
  const [slug, setSlug] = useState(props.slug);
  const [authorName, setAuthorName] = useState(props.authorName);
  const [tags, setTags] = useState(props.tags.join(', '));
  const [heroImageUrl, setHeroImageUrl] = useState(props.heroImageUrl ?? '');
  const [translations, setTranslations] = useState<Translation[]>(
    expandTranslations(props.translations),
  );
  const [activeLocale, setActiveLocale] = useState<MarketingEditorLocale>(
    MARKETING_EDITOR_LOCALES[0],
  );
  const [feedback, setFeedback] = useState<{ kind: 'idle' | 'saved' | 'error'; message?: string }>({
    kind: 'idle',
  });
  const [isPending, startTransition] = useTransition();

  const updateTranslation = (locale: MarketingEditorLocale, patch: Partial<Translation>) => {
    setTranslations((prev) => prev.map((t) => (t.locale === locale ? { ...t, ...patch } : t)));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData();
    fd.append('id', props.postId);
    fd.append('slug', slug);
    fd.append('authorName', authorName);
    fd.append('tags', tags);
    fd.append('heroImageUrl', heroImageUrl);
    // Only persist locales the operator actually filled in (at least a title).
    const payload = translations.filter((t) => t.title.trim().length > 0);
    fd.append('translations', JSON.stringify(payload));
    setFeedback({ kind: 'idle' });
    startTransition(async () => {
      try {
        await updateBlogPostAction(fd);
        setFeedback({ kind: 'saved' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFeedback({
          kind: 'error',
          message: msg === 'slug_conflict' ? m.new.slugConflict : msg,
        });
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="slug">{m.new.slug}</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">{m.new.slugHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="authorName">{m.new.authorName}</Label>
          <Input
            id="authorName"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tags">{m.new.tags}</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          <p className="text-xs text-muted-foreground">{m.new.tagsHint}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heroImageUrl">{m.new.heroImageUrl}</Label>
          <Input
            id="heroImageUrl"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">{m.edit.translations}</Label>
        <Tabs
          value={activeLocale}
          onValueChange={(v) => setActiveLocale(v as MarketingEditorLocale)}
        >
          <TabsList>
            {MARKETING_EDITOR_LOCALES.map((l) => (
              <TabsTrigger key={l} value={l} className="uppercase">
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
          {translations.map((t) => (
            <TabsContent key={t.locale} value={t.locale} className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor={`title-${t.locale}`}>{m.edit.postTitle}</Label>
                <Input
                  id={`title-${t.locale}`}
                  value={t.title}
                  onChange={(e) => updateTranslation(t.locale, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`excerpt-${t.locale}`}>{m.edit.excerpt}</Label>
                <Textarea
                  id={`excerpt-${t.locale}`}
                  rows={2}
                  value={t.excerpt}
                  onChange={(e) => updateTranslation(t.locale, { excerpt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`body-${t.locale}`}>{m.edit.body}</Label>
                <Textarea
                  id={`body-${t.locale}`}
                  rows={20}
                  value={t.body}
                  onChange={(e) => updateTranslation(t.locale, { body: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{m.edit.bodyHint}</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? props.dict.common.saving : props.saveLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          render={
            <Link
              href={props.previewHref ?? `/super-admin/marketing/blog/${props.postId}/preview`}
            />
          }
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {m.edit.preview}
        </Button>
        <PublishButtons postId={props.postId} status={props.status} dict={props.dict} />
        {feedback.kind === 'saved' && (
          <span className="text-xs text-muted-foreground">{m.edit.saved}</span>
        )}
        {feedback.kind === 'error' && (
          <span className="text-xs text-destructive">{feedback.message ?? ''}</span>
        )}
      </div>
    </form>
  );
}

function PublishButtons({
  postId,
  status,
  dict,
}: { postId: string; status: BlogPostStatus; dict: SuperAdminDict['marketing'] }) {
  const m = dict.blog;
  const [isPending, startTransition] = useTransition();

  // type="button" is required: these live inside the outer <form onSubmit>
  // — a nested <form> here would be flattened by the browser and the click
  // would submit the outer form (update) instead of running publish/archive.
  const run = (action: (fd: FormData) => Promise<void>) => {
    const fd = new FormData();
    fd.append('id', postId);
    startTransition(async () => {
      await action(fd);
    });
  };

  if (status === 'published') {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => run(archiveBlogPostAction)}
      >
        <Archive className="mr-2 h-4 w-4" />
        {m.edit.archive}
      </Button>
    );
  }
  return (
    <Button type="button" disabled={isPending} onClick={() => run(publishBlogPostAction)}>
      <Send className="mr-2 h-4 w-4" />
      {m.edit.publish}
    </Button>
  );
}
