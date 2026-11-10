import { ArrowLeft, ArrowRight, Layers, Receipt, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type Highlight = { icon: LucideIcon; title: string; desc: string };

const HIGHLIGHTS: Highlight[] = [
  {
    icon: Zap,
    title: 'Tek transactional adım',
    desc: "Belge geçirilince register'lar, audit, bakiye hareketleri aynı transaction içinde yazılır — yarıda kalırsa rollback. Tutarsız ara durum yok.",
  },
  {
    icon: RotateCcw,
    title: 'Geri alınabilir, izlenebilir',
    desc: "Geçirilmiş belgeyi 'Geri al' dediğin an register satırları silinir, audit log 'unposted' der. Aynı belge bir gün önce, bir ay önce — fark etmez.",
  },
  {
    icon: Layers,
    title: 'Çoklu register desteği',
    desc: "Bir satış faturası aynı anda 3 register'a yazar: stok bakiyesi, alacak hesabı, satış register'ı. Hangi belge tipinin neyi etkileyeceği metadata'da tanımlı.",
  },
  {
    icon: ShieldCheck,
    title: 'Dönem kapanışı koruması',
    desc: "Geçmiş dönemler kapatıldıysa, o döneme yazılan belge 'geçirilemez' işaretiyle döner. Operatör onayıyla açıldığında değişiklikler audit'e iliştirilir.",
  },
];

export async function V2FeatureDetail() {
  const t = await getTranslations('v2_marketing.features');
  return (
    <>
      <div className="container back-row">
        <Link className="back-link" href="/features">
          <ArrowLeft size={14} strokeWidth={2} />
          {t('eyebrow')}
        </Link>
      </div>

      <section className="page-head container">
        <span className="eyebrow">
          <Receipt size={13} strokeWidth={2} /> Posting
        </span>
        <h1>
          Belge → Bakiye saniyeler içinde.
          <span className="sub">Документ → баланс за секунды.</span>
        </h1>
        <p className="lead">
          Bir faturayı geçirdiğin an stok, alacak, kasa hesabın birlikte hareket eder. Geri al —
          register satırları temizlenir. Tek bir transaction'da iş kurallarına zincirlenmiş bir
          akış.
        </p>
      </section>

      <section className="hero-block container">
        <div className="hero-icon">
          <Receipt size={28} strokeWidth={1.75} />
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/sign-up">
            Ücretsiz başla
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
          <Link className="btn btn-secondary" href="/pricing">
            Fiyatları gör
          </Link>
        </div>
      </section>

      <section className="container">
        <div className="highlights">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon;
            return (
              <article key={h.title} className="highlight-card">
                <div className="ico">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3>{h.title}</h3>
                <p>{h.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container">
        <div className="cta-strip">
          <h2>1C alışkanlığına yakın, modern bir akış.</h2>
          <p>
            Belge tiplerini metadata satırından tanımlarsın; ekibinin geri alma, dönem kapatma,
            audit aksiyonları ilk gün hazır gelir.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" href="/sign-up">
              Ücretsiz başla
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <Link className="btn btn-secondary" href="/pricing">
              Fiyatları gör
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
