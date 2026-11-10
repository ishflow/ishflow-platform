import '../globals.css';
import { ClerkThemeProvider } from '@/components/providers/clerk-theme-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { routing } from '@/platform/i18n/routing';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'ishflow',
  description: 'Metadata-driven ERP platform',
  applicationName: 'ishflow',
  appleWebApp: {
    capable: true,
    title: 'ishflow',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

const geist = Geist({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-geist',
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
  weight: ['400', '500'],
});

// Force dynamic rendering: ClerkProvider validates its publishable key at render time,
// which breaks CI builds that use placeholder keys. Every page under this locale tree
// is request-scoped anyway (auth, cookies, tenant context), so static generation yields
// no benefit.
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkThemeProvider locale={locale}>
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
            <Toaster />
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
