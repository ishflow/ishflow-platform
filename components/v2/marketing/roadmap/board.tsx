type RoadmapCard = { title: string; meta: string };
type Column = { title: string; count: number; cards: RoadmapCard[] };

const COLUMNS: Column[] = [
  {
    title: 'Şimdi · Q2 2026',
    count: 5,
    cards: [
      {
        title: 'V2 marketing site',
        meta: '~35 sayfa, variant-9 port — stream 1 in progress',
      },
      { title: 'V2 catalog + document ports', meta: 'Stream 2–3, parallel agents' },
      { title: 'V2 admin + super-admin parity', meta: 'Stream 6–7, paralel' },
      { title: 'Mobile native parity (iOS/Android)', meta: 'Polish + simulator QA' },
      { title: 'Public API durability', meta: 'Idempotency keys, retry policy' },
    ],
  },
  {
    title: 'Sırada · Q3 2026',
    count: 6,
    cards: [
      { title: 'Multi-warehouse FX', meta: 'Cross-currency stock transfers' },
      { title: 'AI OCR fatura', meta: 'PDF/image → structured data' },
      { title: 'Bank import (MT940/CSV)', meta: 'Mutabakat wizard' },
      { title: 'E-fatura entegrasyonu (TR + KG)', meta: 'Government-signed docs' },
      { title: 'Custom report builder', meta: 'Visual query → dashboard widget' },
      { title: 'SSO (SAML)', meta: 'Team plan + Enterprise' },
    ],
  },
  {
    title: 'Sonra · Q4 2026 +',
    count: 6,
    cards: [
      { title: 'On-prem distribution', meta: 'Enterprise VPC + air-gap' },
      { title: 'SOC 2 Type II', meta: 'Q1 2027 hedef' },
      { title: 'Multi-currency consolidation', meta: 'Group reporting' },
      { title: 'Manufacturing module', meta: 'BOM + work orders' },
      { title: 'Embedded analytics', meta: 'Customer-facing dashboards' },
      { title: 'Marketplace integrations', meta: 'Shopify / Trendyol / Hepsiburada' },
    ],
  },
];

export function V2RoadmapBoard() {
  return (
    <div className="roadmap-board">
      {COLUMNS.map((col) => (
        <div key={col.title} className="roadmap-col">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>{col.title}</h3>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{col.count} öğe</span>
          </div>
          {col.cards.map((card) => (
            <div key={card.title} className="roadmap-card">
              <div className="title">{card.title}</div>
              <div className="meta">{card.meta}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
