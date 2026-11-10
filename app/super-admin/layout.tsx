import '@/app/globals.css';

import { Geist, Geist_Mono, Inter } from 'next/font/google';

import { SuperAdminBreadcrumbs } from '@/components/app/super-admin/breadcrumbs';
import { CommandPalette } from '@/components/app/super-admin/command-palette';
import { LanguageSwitcher } from '@/components/app/super-admin/language-switcher';
import { SuperAdminSidebar } from '@/components/app/super-admin/super-admin-sidebar';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { getSuperAdminDict, getSuperAdminLocale } from '@/platform/super-admin/i18n-server';

// Mirror `[locale]/layout.tsx`: globals.css maps `--font-sans` to `--font-inter`
// and `--font-heading`/`--font-display` to `--font-geist`. The super-admin tree
// lives outside the [locale] segment, so this layout must publish the same
// three CSS variables — otherwise font-sans falls back to system-ui.
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

export const dynamic = 'force-dynamic';

/**
 * Root layout for `/super-admin/*`. Renders the chrome directly (the old
 * `PageShell` helper is no longer used) so that:
 *   - the Pro-design `SuperAdminSidebar` (10 nav items + 3 groups) is mounted;
 *   - the global `CommandPalette` is always present, listening for ⌘K / Ctrl+K / `/`;
 *   - path-driven breadcrumbs appear in the top bar.
 *
 * Lives outside the `[locale]` segment, so this component is responsible for
 * the `<html>` + `<body>` chrome — including the Geist font variables that
 * the rest of the app gets from `[locale]/layout.tsx`.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await assertSuperAdmin();

  const locale = await getSuperAdminLocale();
  const dict = await getSuperAdminDict();

  return (
    <html
      lang={locale}
      className={`dark h-full antialiased ${inter.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans">
        <SidebarProvider>
          <SuperAdminSidebar dict={dict.nav} />
          <SidebarInset className="min-w-0">
            <header className="flex h-14 items-center gap-2 border-b bg-background px-4 lg:px-6">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <SuperAdminBreadcrumbs dict={dict.shell.breadcrumb} nav={dict.nav.items} />
              <div className="ml-auto">
                <LanguageSwitcher current={locale} dict={dict.languageSwitcher} />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
          </SidebarInset>
          <CommandPalette dict={dict.shell.palette} />
        </SidebarProvider>
      </body>
    </html>
  );
}
