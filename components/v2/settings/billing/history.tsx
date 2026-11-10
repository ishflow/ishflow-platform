import { Download, ExternalLink, Pause } from 'lucide-react';

type Event = {
  id: string;
  date: string;
  title: string;
  desc?: string;
  reason?: string;
  fields?: Array<{ k: string; v: string }>;
  invoiceId?: string;
  tone?: 'normal' | 'cancel' | 'pause';
  current?: boolean;
};

const EVENTS: Event[] = [
  {
    id: 'now',
    date: '12 May 2026',
    title: 'Pro plan — şu an',
    desc: 'Aylık $49 · 5 üye · 12 Oca 2026 başlangıç',
    invoiceId: 'isf_2026_06_upcoming',
    current: true,
  },
  {
    id: 'downgrade',
    date: '8 May 2026',
    title: "Team'den Pro'ya düşürme",
    fields: [
      { k: 'Önceki plan', v: 'Team · $99/ay · 15 üye' },
      { k: 'Yeni plan', v: 'Pro · $49/ay · 5 üye' },
    ],
    reason:
      'Müşteri talebi — küçülen ekip. Pro-rata $34.66 kredisi bir sonraki faturadan düşülecek.',
    invoiceId: 'isf_2026_05_credit',
  },
  {
    id: 'upgrade',
    date: '4 Mar 2026',
    title: "Pro yıllık'tan Team'e yükseltme",
    fields: [
      { k: 'Önceki plan', v: 'Pro · $29/ay · Yıllık (eski)' },
      { k: 'Yeni plan', v: 'Team · $99/ay · 15 üye' },
    ],
    reason:
      'Ekip 4→11 üyeye büyüdü. Yıllık plandan kalan 7 ay $203 olarak Team aboneliğine aktarıldı.',
    invoiceId: 'isf_2026_03_upgrade',
  },
  {
    id: 'pause',
    date: '15 Şub 2026',
    title: 'Pro plan duraklatıldı (14 gün)',
    desc: 'Yıllık tatil — 1-14 Mart arası dondurma',
    tone: 'pause',
  },
  {
    id: 'annual',
    date: '12 Şub 2026',
    title: 'Yıllık plana geçiş',
    fields: [
      { k: 'Önceki plan', v: 'Pro · $29/ay · Aylık' },
      { k: 'Yeni plan', v: 'Pro · $290/yıl · Yıllık (2 ay bedava)' },
    ],
    reason:
      'Yıllık indirim teklifi kullanıldı. Mart 2026 Team yükseltmesinde ay sayısına göre yeniden düzenlendi.',
    invoiceId: 'isf_2026_02_annual',
  },
  {
    id: 'first',
    date: '12 Oca 2026',
    title: 'Pro aboneliği başladı',
    fields: [
      { k: 'Önceki plan', v: 'Free · $0/ay · 1 üye' },
      { k: 'Yeni plan', v: 'Pro · $29/ay · 5 üye (eski fiyat)' },
    ],
    reason:
      'Pro deneme süresi sona erdi, otomatik olarak ücretli Pro plana geçildi. İlk kart eklendi (VISA •••• 4242).',
    invoiceId: 'isf_2026_01',
  },
];

export function V2BillingHistory() {
  return (
    <>
      <section className="card">
        <div className="card-header">
          <div className="card-title">Abonelik tarihçesi</div>
          <button className="btn btn-secondary btn-sm" type="button">
            <Download size={14} strokeWidth={1.75} />
            CSV indir
          </button>
        </div>
        {EVENTS.map((e) => (
          <div
            key={e.id}
            className={`tl-row${e.tone === 'cancel' ? ' is-cancel' : e.tone === 'pause' ? ' is-pause' : ''}`}
          >
            <div className="tl-dot" />
            <div className="tl-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4>{e.title}</h4>
                {e.tone === 'pause' ? (
                  <span className="pill pill-warning">
                    <Pause size={10} strokeWidth={2.5} /> Duraklatıldı
                  </span>
                ) : null}
                {e.current ? <span className="pill pill-success">Aktif</span> : null}
              </div>
              <div className="tl-meta">{e.date}</div>
              {e.fields ? (
                <div className="tl-fields">
                  {e.fields.map((f) => (
                    <div key={f.k} className="field">
                      <div className="k">{f.k}</div>
                      <div className="v">{f.v}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {e.desc ? <div className="tl-reason">{e.desc}</div> : null}
              {e.reason ? (
                <div className="tl-reason">
                  <b>Sebep:</b> {e.reason}
                </div>
              ) : null}
              {e.invoiceId ? (
                <button type="button" className="invoice-link">
                  {e.invoiceId} · PDF <ExternalLink size={11} strokeWidth={1.75} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
