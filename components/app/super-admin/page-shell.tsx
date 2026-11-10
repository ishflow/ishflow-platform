import '@/app/globals.css';

import { Geist, Geist_Mono } from 'next/font/google';

import { LanguageSwitcher } from '@/components/app/super-admin/language-switcher';
import { SuperAdminSidebar } from '@/components/app/super-admin/nav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { getSuperAdminDict, getSuperAdminLocale } from '@/platform/super-admin/i18n-server';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

/**
 * Root shell for `/super-admin/*`. The super-admin route group lives outside
 * the `[locale]` segment, so this component is the root layout responsible
 * for the `<html>` + `<body>` chrome — including the Geist font variables
 * that the rest of the app gets from `[locale]/layout.tsx`.
 */
export async function PageShell({ children }: { children: React.ReactNode }) {
  const locale = await getSuperAdminLocale();
  const dict = await getSuperAdminDict();

  return (
    <html
      lang={locale}
      className={`dark h-full antialiased ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans">
        <SidebarProvider>
          <SuperAdminSidebar dict={dict.nav} />
          <SidebarInset className="min-w-0">
            <header className="flex h-14 items-center gap-2 border-b bg-background px-4 lg:px-6">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{dict.breadcrumb.superAdmin}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto">
                <LanguageSwitcher current={locale} dict={dict.languageSwitcher} />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
