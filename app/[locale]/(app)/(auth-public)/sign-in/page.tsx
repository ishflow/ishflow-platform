import { V2SignInForm } from '@/components/v2/marketing/auth/sign-in-form';

export default async function V2SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <V2SignInForm locale={locale} />;
}
