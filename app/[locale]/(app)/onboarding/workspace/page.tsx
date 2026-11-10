import { V2OnboardingFrame } from '@/components/v2/settings/onboarding/wizard-frame';
import { WorkspaceForm } from './workspace-form';

export default async function V2OnboardingWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <V2OnboardingFrame step={2} total={4}>
      <section className="onb-card">
        <div className="eyebrow">Adım 2</div>
        <h1>Çalışma alanını kur</h1>
        <p className="lede">
          Şirket adı ve para birimini bir kez ayarla, daha sonra ayarlardan değiştirebilirsin.
        </p>

        <WorkspaceForm locale={locale} />
      </section>
    </V2OnboardingFrame>
  );
}
