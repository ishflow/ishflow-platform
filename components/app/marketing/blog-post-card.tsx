import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/platform/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';

interface BlogPostCardProps {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date | string | null;
  authorName: string;
  tags: string[];
  heroImageUrl?: string | null;
  locale: string;
}

export function BlogPostCard({
  slug,
  title,
  excerpt,
  publishedAt,
  authorName,
  tags,
  heroImageUrl,
  locale,
}: BlogPostCardProps) {
  const date = publishedAt ? new Date(publishedAt) : null;
  const dateStr = date
    ? new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
    : null;

  return (
    <Link href={`/blog/${slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/60 bg-card/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt="" className="h-44 w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-primary/20 via-background to-secondary/30" />
        )}
        <CardContent className="flex flex-col gap-3 p-6">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <h3 className="line-clamp-2 text-base font-semibold tracking-tight">{title}</h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {authorName}
              {dateStr ? ` · ${dateStr}` : ''}
            </span>
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
