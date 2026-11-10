import { V2OnboardingFrame } from '@/components/v2/settings/onboarding/wizard-frame';
import { ArrowRight, Database, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function V2OnboardingDemoPage() {
  return (
    <V2OnboardingFrame step={3} total={4}>
      <section className="onb-card wide">
        <div className="eyebrow">Adım 3</div>
        <h1>Demo veri yüklensin mi?</h1>
        <p className="lede">
          Hızlıca keşfetmek istiyorsan demo şirketle başla. Sonradan tek tıkla temizleyebilirsin.
        </p>

        <div className="onb-pick">
          <Link className="opt is-active" href="/onboarding/done?demo=1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} strokeWidth={1.75} />
              <h3>Demo veriyle başla</h3>
            </div>
            <p>
              50 ürün, 25 müşteri, 30 satış faturası, 15 alış faturası. Tüm raporlar ve register'lar
              hazır — gerçekçi senaryo ile keşfet.
            </p>
            <span className="dim" style={{ fontSize: 11.5 }}>
              Önerilen · 5 saniye yüklenir
            </span>
          </Link>

          <Link className="opt" href="/onboarding/done">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} strokeWidth={1.75} />
              <h3>Boş çalışma alanı</h3>
            </div>
            <p>
              Kendi verinle başla. Ürünlerini el ile veya CSV import ile ekleyebilirsin. Demo veri
              istersen sonra Ayarlar → İçe aktarma'dan yükleyebilirsin.
            </p>
          </Link>
        </div>

        <div className="onb-actions">
          <Link className="onb-skip" href="/onboarding/workspace">
            ← Geri
          </Link>
          <Link className="btn btn-ghost" href="/onboarding/done">
            Atla
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </V2OnboardingFrame>
  );
}
