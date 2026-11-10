import { V2OnboardingFrame } from '@/components/v2/settings/onboarding/wizard-frame';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function V2OnboardingOrganizationPage() {
  return (
    <V2OnboardingFrame step={2} total={4}>
      <section className="onb-card wide">
        <div className="eyebrow">Kuruluş bilgileri</div>
        <h1>Yasal kimlik ve iletişim</h1>
        <p className="lede">
          Bu bilgiler faturalarda ve resmî belgelerde görünür. Sonradan Ayarlar → Kuruluş'tan
          değiştirebilirsin.
        </p>

        <div className="onb-form">
          <div className="row">
            <div>
              <label htmlFor="org-name">Şirket adı (yasal)</label>
              <input id="org-name" className="input" defaultValue="Sample Trading LLC" />
              <div className="hint">Faturalarda gözüken hukuki ad.</div>
            </div>
            <div>
              <label htmlFor="org-brand">Ticari unvan</label>
              <input id="org-brand" className="input" defaultValue="Sample Trading" />
              <div className="hint">Markada kullanılan kısa ad.</div>
            </div>
          </div>

          <div className="row">
            <div>
              <label htmlFor="org-vkn">Vergi No (VKN)</label>
              <input id="org-vkn" className="input mono" defaultValue="1234567890" />
            </div>
            <div>
              <label htmlFor="org-mersis">MERSIS No</label>
              <input id="org-mersis" className="input mono" defaultValue="0123-4567-8901-2345" />
            </div>
          </div>

          <div className="row">
            <div>
              <label htmlFor="org-vd">Vergi dairesi</label>
              <input id="org-vd" className="input" defaultValue="Kadıköy" />
            </div>
            <div>
              <label htmlFor="org-tsc">Ticaret sicil no</label>
              <input id="org-tsc" className="input mono" defaultValue="123456-5" />
            </div>
          </div>

          <div>
            <label htmlFor="org-addr">Adres</label>
            <textarea
              id="org-addr"
              className="input"
              rows={2}
              defaultValue="Bağdat Cad. No: 123, Kadıköy / İstanbul"
            />
          </div>

          <div className="row">
            <div>
              <label htmlFor="org-phone">Telefon</label>
              <input id="org-phone" className="input mono" defaultValue="+90 216 555 0123" />
            </div>
            <div>
              <label htmlFor="org-em">E-posta</label>
              <input id="org-em" className="input" defaultValue="info@sample-trading.com" />
            </div>
          </div>
        </div>

        <div className="onb-actions">
          <Link className="onb-skip" href="/onboarding/workspace">
            ← Geri
          </Link>
          <Link className="btn btn-primary" href="/onboarding/demo">
            Kaydet ve devam et
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </V2OnboardingFrame>
  );
}
