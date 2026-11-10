import { V2SignUpForm } from '@/components/v2/marketing/auth/sign-up-form';

export default async function V2SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <V2SignUpForm locale={locale} />;
}
