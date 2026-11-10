import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserButton } from '@clerk/nextjs';
import { LanguageSwitcher } from './language-switcher';
import { TenantSwitcher } from './tenant-switcher';
import { ThemeSwitcher } from './theme-switcher';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <TenantSwitcher />
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
