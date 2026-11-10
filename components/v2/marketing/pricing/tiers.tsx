import { Check, X } from 'lucide-react';
import Link from 'next/link';

export type PricingTier = {
  name: string;
  desc: string;
  price: string;
  per?: string;
  features: { label: string; dim?: boolean }[];
  cta: { label: string; href: string; variant: 'primary' | 'secondary' };
  popular?: boolean;
  popularBadge?: string;
};

const TIERS: PricingTier[] = [
  {
    name: 'Free',
    desc: 'Tek kişilik test sürüşü. Sınırsız okuma, sınırlı belge.',
    price: '$0',
    per: ' / ay',
    features: [
      { label: '1 kullanıcı' },
      { label: '500 belge / ay' },
      { label: 'Catalog & Document & Register' },
      { label: '1C import (tek seferlik)' },
      { label: 'Çoklu kullanıcı', dim: true },
      { label: 'API erişimi', dim: true },
    ],
    cta: { label: 'Ücretsiz başla', href: '/sign-up', variant: 'secondary' },
  },
  {
    name: 'Pro',
    desc: 'Küçük ekipler için. Tüm operasyonel modüller açık.',
    price: '$29',
    per: ' / kullanıcı / ay',
    features: [
      { label: '5 kullanıcıya kadar' },
      { label: '10.000 belge / ay' },
      { label: 'Tüm entegrasyonlar' },
      { label: 'Rol bazlı arayüz' },
      { label: 'API + Webhook' },
      { label: 'E-posta desteği' },
    ],
    cta: { label: '14 gün ücretsiz', href: '/sign-up', variant: 'primary' },
    popular: true,
    popularBadge: 'Popüler',
  },
  {
    name: 'Team',
    desc: 'Büyüyen şirketler için. Esnek rol ve denetim.',
    price: '$79',
    per: ' / kullanıcı / ay',
    features: [
      { label: '20 kullanıcıya kadar' },
      { label: 'Sınırsız belge' },
      { label: 'Özel rol şablonları' },
      { label: 'Dönem kapanışı + ek onay' },
      { label: 'Öncelikli destek' },
      { label: 'SSO (SAML)' },
    ],
    cta: { label: "Pro'dan yükselt", href: '/sign-up', variant: 'secondary' },
  },
  {
    name: 'Enterprise',
    desc: "Yüksek hacimli kurumlar. Kendi DC'nde ya da bizimle.",
    price: 'Konuşalım',
    features: [
      { label: 'Sınırsız kullanıcı' },
      { label: 'VPC / on-prem' },
      { label: 'Özel SLA' },
      { label: 'Kıdemli teknik hesap yöneticisi' },
      { label: 'SOC 2 raporu' },
      { label: 'Özel entegrasyon geliştirme' },
    ],
    cta: { label: 'Bize ulaş', href: '/contact', variant: 'secondary' },
  },
];

export function V2PricingTiers() {
  return (
    <div className="price-grid-4">
      {TIERS.map((t) => (
        <div key={t.name} className={`price-card${t.popular ? ' is-pop' : ''}`}>
          {t.popular && t.popularBadge ? <div className="pop-badge">{t.popularBadge}</div> : null}
          <div className="name">{t.name}</div>
          <div className="desc">{t.desc}</div>
          <div className="price">
            {t.price}
            {t.per ? <span className="per">{t.per}</span> : null}
          </div>
          <ul>
            {t.features.map((f) => (
              <li key={f.label} className={f.dim ? 'dim' : undefined}>
                {f.dim ? <X size={14} strokeWidth={2} /> : <Check size={14} strokeWidth={2.25} />}
                {f.label}
              </li>
            ))}
          </ul>
          <Link className={`btn btn-${t.cta.variant}`} href={t.cta.href}>
            {t.cta.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
