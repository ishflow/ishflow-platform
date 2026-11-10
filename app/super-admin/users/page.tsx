import { UserSearch } from '@/components/app/super-admin/user-search';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';
import { searchUsers } from '@/platform/super-admin/search-users';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SuperAdminUsersPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams;
  const [results, dict] = await Promise.all([searchUsers(q), getSuperAdminDict()]);
  return <UserSearch q={q} results={results} dict={dict} />;
}
