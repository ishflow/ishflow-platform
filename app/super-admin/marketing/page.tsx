import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import {
  ArrowRight,
  FileText,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
  Mail,
  Newspaper,
} from 'lucide-react';
import Link from 'next/link';

interface Tile {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export default async function MarketingLandingPage() {
  const dict = await getSuperAdminDict();
  const m = dict.marketing.landing;

  const tiles: ReadonlyArray<Tile> = [
    {
      href: '/super-admin/marketing/sections',
      title: m.tiles.sections.title,
      description: m.tiles.sections.description,
      icon: LayoutTemplate,
    },
    {
      href: '/super-admin/marketing/blog',
      title: m.tiles.blog.title,
      description: m.tiles.blog.description,
      icon: Newspaper,
    },
    {
      href: '/super-admin/marketing/media',
      title: m.tiles.media.title,
      description: m.tiles.media.description,
      icon: FileText,
    },
    {
      href: '/super-admin/marketing/leads',
      title: m.tiles.leads.title,
      description: m.tiles.leads.description,
      icon: Inbox,
    },
    {
      href: '/super-admin/marketing/newsletter',
      title: m.tiles.newsletter.title,
      description: m.tiles.newsletter.description,
      icon: Mail,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.subtitle}</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.href}>
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {tile.title}
                </CardTitle>
                <CardDescription>{tile.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  render={<Link href={tile.href} />}
                >
                  {tile.title}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
