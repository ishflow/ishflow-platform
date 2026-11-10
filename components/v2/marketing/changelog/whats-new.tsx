import { getTranslations } from 'next-intl/server';

type WhatsNewEntry = { emoji: string; title: string; lede: string; tag: string };

const ENTRIES: WhatsNewEntry[] = [
  {
    emoji: '📱',
    title: 'Mobil uygulama tab bar yeniden tasarımı',
    lede: "4 tab (Home/Docs/Stock/Cari) + center FAB + arama-rol button. iOS Faz 2 production'da.",
    tag: 'iOS · Android',
  },
  {
    emoji: '🏢',
    title: 'Multi-tenant: Süper Admin Konsolu',
    lede: 'Operatör konsolu — tenants, billing, audit, impersonation, manual plan upgrade.',
    tag: 'Web · Backend',
  },
  {
    emoji: '💳',
    title: 'Abonelik sistemi (Stripe Checkout)',
    lede: '4-tier plan + Stripe Portal + iOS handoff. Trial-end banner + Resend ile e-posta uyarısı.',
    tag: 'Billing',
  },
  {
    emoji: '🐛',
    title: 'Dinamik fiyatlandırma: cost = 0 bug fix',
    lede: 'resolvePriceForType opt-in liveCost. iOS sales wizard birim fiyat = 0 hatası tamir.',
    tag: 'Fix',
  },
  {
    emoji: '📊',
    title: 'Tabs + Entity Cover',
    lede: 'Çoklu sekme yönetimi + entity hover kart. 21 unit test pass.',
    tag: 'UX',
  },
];

export async function V2WhatsNew() {
  const t = await getTranslations('v2_marketing.whatsNew');
  return (
    <main className="public-main container">
      <div className="page-head is-left">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>
          {t('title')}
          <span
            style={{
              fontWeight: 500,
              fontSize: 17,
              color: 'var(--text-muted)',
              marginLeft: 12,
            }}
          >
            {t('sub')}
          </span>
        </h1>
        <p className="lead">{t('lead')}</p>
      </div>

      <section style={{ marginBottom: 56 }}>
        {ENTRIES.map((e) => (
          <article key={e.title} className="changelog-entry-row">
            <div className="date">{e.tag}</div>
            <h3>
              {e.emoji} {e.title}
            </h3>
            <p>{e.lede}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
