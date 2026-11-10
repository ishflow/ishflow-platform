import { getTranslations } from 'next-intl/server';

type TimelineRow = { when: string; what: string };

const TIMELINE: TimelineRow[] = [
  { when: 'Q1 2026', what: 'Sprint 0 — Foundation. Next.js + Postgres + RLS + Clerk + i18n.' },
  {
    when: 'Q1 2026',
    what: 'Sprint 1–17 — Catalog/Document/Register engine + ilk üretim müşterileri.',
  },
  {
    when: 'Q2 2026',
    what: 'Sprint 18–28 — Warehouse, period-close, FX, attachments, pricing register.',
  },
  {
    when: 'Q2 2026',
    what: 'Sprint 29–32 — Currency, role catalog, public API MVP, marketing site.',
  },
  { when: 'Q2 2026', what: 'iOS native + Android native MVP, mobile sales wizard parity.' },
];

export async function V2AboutSections() {
  const t = await getTranslations('v2_marketing.about');

  return (
    <main className="public-main container">
      <section className="about-hero">
        <h1>
          {t('headline1')}
          <span className="sub">{t('sub')}</span>
        </h1>
        <p className="lead">{t('lead')}</p>
      </section>

      <section className="about-section">
        <h2>Misyon</h2>
        <p>
          1C, eski mali yazılım ve yerel KOBİ deneyimi var. Her birimiz bir müşteri saha gününe
          çıkar — mali kapanış sürerken, depo sayımı yapılırken, satıcı evrak getirirken aynı ekranı
          izleriz.
        </p>
        <p>
          Hedefimiz: yerel muhasebenin tüm zekasını koruyup, modern bir akış disipliniyle
          ölçeklendirmek. Metadata-driven mimari kod yazmadan modül üretir; her register tek
          transaction'da yazar; her audit kaydı geriye dönük korunur.
        </p>
      </section>

      <section className="about-section">
        <h2>Kısa bir kronoloji</h2>
        <div className="timeline">
          {TIMELINE.map((row, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: timeline ordering is stable
            <div key={idx} className="timeline-row">
              <div className="when">{row.when}</div>
              <div className="what">{row.what}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Ekip</h2>
        <p>
          5 kişilik çekirdek — 2 backend, 2 frontend, 1 müşteri başarı. Aydar (CFO Naimov Trading) +
          Esra (Vatan Bilgisayar muhasebe) düzenli olarak ekip toplantılarına katılır.
        </p>
      </section>
    </main>
  );
}
