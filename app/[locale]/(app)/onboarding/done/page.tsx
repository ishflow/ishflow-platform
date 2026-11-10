import { LaunchToDashboard } from '@/components/v2/settings/onboarding/launch-to-dashboard';
import { V2OnboardingFrame } from '@/components/v2/settings/onboarding/wizard-frame';
import { ArrowRight, Check, FileText, Package, Users } from 'lucide-react';
import Link from 'next/link';

export default function V2OnboardingDonePage() {
  return (
    <V2OnboardingFrame step={4} total={4}>
      <section className="onb-card">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: 'var(--success-soft)',
            color: 'var(--success-text)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 18px',
          }}
        >
          <Check size={28} strokeWidth={2} />
        </div>
        <h1 style={{ textAlign: 'center' }}>Hazırsın!</h1>
        <p className="lede" style={{ textAlign: 'center' }}>
          Çalışma alanın oluşturuldu, demo veriler yüklendi. Şimdi dashboard'a git ya da ilk ürününü
          ekle.
        </p>

        <ul className="onb-bullets">
          <li>
            <span className="bico">
              <Package size={16} strokeWidth={1.75} />
            </span>
            <span className="btx">
              <b>Ürün ekle</b>
              <span>Tek tek veya CSV ile toplu içe aktar.</span>
            </span>
          </li>
          <li>
            <span className="bico">
              <Users size={16} strokeWidth={1.75} />
            </span>
            <span className="btx">
              <b>Müşteri / tedarikçi tanımla</b>
              <span>Faturalarda otomatik tamamlanır.</span>
            </span>
          </li>
          <li>
            <span className="bico">
              <FileText size={16} strokeWidth={1.75} />
            </span>
            <span className="btx">
              <b>İlk faturanı yaz</b>
              <span>2 dakikada post et — register'lar otomatik güncellenir.</span>
            </span>
          </li>
        </ul>

        <div className="onb-actions">
          <Link className="onb-skip" href="/onboarding/tour">
            Tur tekrarı
          </Link>
          <LaunchToDashboard className="btn btn-primary">
            Panoya git
            <ArrowRight size={16} strokeWidth={1.75} />
          </LaunchToDashboard>
        </div>
      </section>
    </V2OnboardingFrame>
  );
}
