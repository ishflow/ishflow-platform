import { EnterAppLink } from '@/components/v2/settings/onboarding/enter-app-link';
import { V2OnboardingFrame } from '@/components/v2/settings/onboarding/wizard-frame';
import { ArrowRight, FileText, Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function V2OnboardingWelcomePage() {
  return (
    <V2OnboardingFrame step={1} total={4}>
      <section className="onb-card">
        <div className="eyebrow">Hoş geldin</div>
        <h1>Hoş geldin 👋</h1>
        <p className="lede">
          ishflow küçük işletmeler için tasarlanmış metadata tabanlı bir muhasebe + envanter
          platformudur. Hazırlık 2 dakika sürer — sonra ürünleri eklemeye başlayabilirsin.
        </p>

        <ul className="onb-bullets">
          <li>
            <span className="bico">
              <Package size={16} strokeWidth={1.75} />
            </span>
            <span className="btx">
              <b>Ürünleri tanımla</b>
              <span>Katalog → faturalara otomatik bağlanır. CSV ile toplu içe aktarım da var.</span>
            </span>
          </li>
          <li>
            <span className="bico">
              <FileText size={16} strokeWidth={1.75} />
            </span>
            <span className="btx">
              <b>Faturaları yönet</b>
              <span>
                Satış, alış ve ödeme belgeleri — bir kez posted, register'lara otomatik düşer.
              </span>
            </span>
          </li>
          <li>
            <span className="bico">
              <TrendingUp size={16} strokeWidth={1.75} />
            </span>
            <span className="btx">
              <b>Raporları gör</b>
              <span>
                Nakit, A/R, A/P, brüt kar, dönem kapatma — tek bir gerçek-zamanlı kaynaktan.
              </span>
            </span>
          </li>
        </ul>

        <div className="onb-actions">
          <EnterAppLink className="onb-skip">Şimdilik atla</EnterAppLink>
          <Link className="btn btn-primary" href="/onboarding/workspace">
            Başla
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </V2OnboardingFrame>
  );
}
