import {
  AlertTriangle,
  Bell,
  CreditCard,
  Link as LinkIcon,
  Lock,
  type LucideIcon,
  Package,
  Scale,
  Settings,
  Upload,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

type Card = {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  updated: string;
  danger?: boolean;
};

const CARDS: Card[] = [
  {
    href: '/settings/general',
    icon: Settings,
    title: 'Genel',
    desc: 'Çalışma alanı adı, dil, zaman dilimi, tema ve görünüm.',
    updated: 'Son güncelleme · 12 May 2026',
  },
  {
    href: '/settings/general',
    icon: Package,
    title: 'Kuruluş',
    desc: 'Şirket bilgileri, logo, VKN, adres ve iletişim.',
    updated: 'Son güncelleme · 8 May 2026',
  },
  {
    href: '/settings/general',
    icon: Wallet,
    title: 'Para birimi',
    desc: 'Varsayılan kur, kur güncellemesi ve aktif para birimleri.',
    updated: 'Son güncelleme · 14 May 2026',
  },
  {
    href: '/settings/general',
    icon: Scale,
    title: 'Vergi & numara',
    desc: 'KDV oranları, belge numara serileri ve yuvarlama.',
    updated: 'Son güncelleme · 4 May 2026',
  },
  {
    href: '/settings/notifications',
    icon: Bell,
    title: 'Bildirimler',
    desc: 'E-posta, in-app ve mobil push ayarları, eşikler.',
    updated: 'Son güncelleme · 11 May 2026',
  },
  {
    href: '/settings/sessions',
    icon: Lock,
    title: 'Güvenlik',
    desc: '2FA, oturumlar, cihaz yönetimi ve şifre politikası.',
    updated: 'Son güncelleme · 16 May 2026',
  },
  {
    href: '/settings/billing',
    icon: CreditCard,
    title: 'Faturalandırma',
    desc: 'Abonelik planı, ödeme yöntemi ve faturalar.',
    updated: 'Son güncelleme · 1 May 2026',
  },
  {
    href: '/settings/api',
    icon: Zap,
    title: 'API & Webhook',
    desc: "Public API anahtarları ve event webhook URL'leri.",
    updated: 'Son güncelleme · 9 May 2026',
  },
];

const OTHER_LINKS: Array<{ href: string; icon: LucideIcon; label: string; danger?: boolean }> = [
  { href: '/addons', icon: LinkIcon, label: 'Entegrasyonlar' },
  { href: '/addons', icon: Zap, label: 'Eklenti mağazası' },
  { href: '/admin/import', icon: Upload, label: 'İçe aktarma' },
  { href: '/settings/danger', icon: AlertTriangle, label: 'Tehlikeli alan', danger: true },
];

export function V2SettingsIndex() {
  return (
    <>
      <div className="settings-grid">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={`${c.href}-${c.title}`}
              href={c.href}
              className={`settings-card${c.danger ? ' danger' : ''}`}
            >
              <div className="ico">
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <div className="updated">{c.updated}</div>
            </Link>
          );
        })}
      </div>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Diğer bağlantılar</div>
        </div>
        <div className="other-links">
          {OTHER_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href + l.label}
                href={l.href}
                className={`other-link${l.danger ? ' danger' : ''}`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
