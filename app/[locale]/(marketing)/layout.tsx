import { MarketingFooter } from '@/components/app/marketing/marketing-footer';
import { MarketingNav } from '@/components/app/marketing/marketing-nav';
import { MarketingSpotlight } from '@/components/app/marketing/marketing-spotlight';
import { auth } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let signedIn = false;
  try {
    const { userId } = await auth();
    signedIn = Boolean(userId);
  } catch {
    signedIn = false;
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingSpotlight />
      <MarketingNav signedIn={signedIn} />
      <main className="flex-1">{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
