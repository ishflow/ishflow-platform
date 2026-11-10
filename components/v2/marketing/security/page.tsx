import { Eye, FileCheck, KeyRound, Lock, Shield, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type Pillar = { icon: LucideIcon; title: string; desc: string };

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: 'Mimari kiracı izolasyonu',
    desc: "Her satır tenantId sütununa bağlı. Postgres Row-Level Security FORCE etkin; runtime'ı tutan rol bypass yetkisi taşımaz.",
  },
  {
    icon: Eye,
    title: 'Sıfır gizli yazma yolu',
    desc: "Tüm yazmalar audit'e gider — withTenant veya withBypass farkı önemli değil. Bypass kullanımı ayrıca raporlanır.",
  },
  {
    icon: Shield,
    title: 'Saldırı yüzeyi minimum',
    desc: "Ekler R2'de imzalı URL ile servis edilir. PDF'ler ayrı sandbox iframe içinde — XSS düzlemi kapatılır.",
  },
];

type Control = { name: string; desc: React.ReactNode };

const CONTROLS: Control[] = [
  {
    name: 'Postgres RLS',
    desc: (
      <>
        Her tenant_id sütunlu tabloda <code>ALTER TABLE ... FORCE ROW LEVEL SECURITY</code> aktif.
        Uygulamanın bağlandığı rol bypass yetkisi olmadan tasarlandı.
      </>
    ),
  },
  {
    name: 'Audit log',
    desc: 'Kullanıcı, IP, eylem, tablo, satır, eski/yeni değerler. Audit kaydının kendisi de değiştirilemez (append-only).',
  },
  {
    name: 'Ek imzalı URL',
    desc: 'Eklere hiçbir kullanıcı doğrudan erişemez. Her görüntüleme için 5 dakikalık imzalı URL üretilir; PDF iframe içinde çalışır.',
  },
  {
    name: 'Rol katalogu',
    desc: "9 sistem rolü + her kiracı için özel roller. RBAC kararı her server action'da merkezi assertCan() üzerinden geçer.",
  },
  {
    name: 'Yedek + PITR',
    desc: "Neon Postgres PITR; Free'de 7 gün, Pro+'da 35 gün. Enterprise için özel saklama ve yedek ihracı yapılabilir.",
  },
  {
    name: 'BotID + DDoS',
    desc: 'Otomatik DDoS azaltma, BotID ile bot doğrulama, attack mode için manuel anahtar.',
  },
];

export async function V2SecurityPage() {
  const t = await getTranslations('v2_marketing.security');
  return (
    <main className="public-main container">
      <div className="page-head">
        <div className="eyebrow">{t('eyebrow')}</div>
        <h1>{t('title')}</h1>
        <p className="lead">{t('lead')}</p>
      </div>

      <div className="feature-grid">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <article key={p.title} className="feature-card">
              <div className="glyph">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </article>
          );
        })}
      </div>

      <section className="about-section" style={{ marginTop: 36 }}>
        <h2>Standartlar ve sertifikasyonlar</h2>
        <p>
          GDPR (AB) ve KVKK (TR) uyumlu. SOC 2 Type I Q3 2026'da, Type II Q1 2027'de hedeflendi. ISO
          27001 hazırlık aşamasında. Enterprise müşteriler için DPA + güvenlik soru formu
          paylaşılır.
        </p>
      </section>

      <section className="about-section">
        <h2>Teknik kontroller</h2>
        <div className="controls-list">
          {CONTROLS.map((c) => (
            <div key={c.name} className="control-row">
              <div className="control-name">{c.name}</div>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Sorumlu açıklama</h2>
        <p>
          Güvenlik araştırmacıları için{' '}
          <a href="mailto:security@ishflow.com" style={{ color: 'var(--text)', fontWeight: 600 }}>
            security@ishflow.com
          </a>
          . 24 saat içinde ilk yanıt, 30 gün içinde fix taahhüdü.
        </p>
        <div className="cta-strip">
          <div className="glyph" style={{ display: 'none' }}>
            <ShieldCheck />
            <KeyRound />
            <FileCheck />
          </div>
          <h2>Enterprise için detaylı güvenlik raporu</h2>
          <p>VPC / on-prem, özel SLA, kıdemli güvenlik mühendisliği desteği — Enterprise planda.</p>
          <div className="actions">
            <a className="btn btn-primary" href="mailto:security@ishflow.com">
              Bize ulaş
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
