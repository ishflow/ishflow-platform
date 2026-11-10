type Entry = { date: string; title: string; body: string; major?: boolean };

const ENTRIES: Entry[] = [
  {
    date: '18 May 2026',
    title: 'V0.2 — V2 shell + dashboard + invoice screens',
    body: 'Stream A/B/C/D shell altyapısı + Stream C dashboard + Stream D documents bitti. Tabs + topbar + rail/panel.',
    major: true,
  },
  {
    date: '13 May 2026',
    title: 'Public API MVP + super-admin console + 3 specs',
    body: "Public API stable endpoints; Super-admin console; subscription system; onboarding wizard — hepsi prod'a indi.",
  },
  {
    date: '12 May 2026',
    title: 'Subscription system + iOS onboarding',
    body: 'Stripe Checkout + Portal entegrasyonu, plan matrix, assertPlanAllows enforcement. iOS onboarding flow + Apple Sign In.',
    major: true,
  },
  {
    date: '11 May 2026',
    title: 'Android iOS-parity Wave 5',
    body: "22 ajan ile 5 dalga halinde Android, iOS'a ~100% parite. Cari 400, doc detail nav, dashboard rows fix.",
  },
  {
    date: '5 May 2026',
    title: 'Rol kataloğu — 1C konvansiyonu',
    body: 'Bookkeeper/sales/cashier/warehouse rolleri + i18n etiketler + RBAC merkezi assertCan().',
  },
  {
    date: '28 Nis 2026',
    title: '1C-style pricing register',
    body: 'InformationRegister DSL + period-correct resolver + Layer-2 hint labels. Customer/invoice priceType eklendi.',
    major: true,
  },
  {
    date: '22 Nis 2026',
    title: 'Document detail unified',
    body: 'POSTED docs now render /new layout with only date editable. SalesInvoiceView deleted, list column = business date.',
  },
  {
    date: '18 Nis 2026',
    title: 'Overnight batch — Sprint 19-25',
    body: '6 PR merged: warehouse, period-close, FX, PDF, attachments, saved-views, audit-search. Prod Neon migrated.',
  },
  {
    date: '12 Nis 2026',
    title: 'iOS Onboarding shipped',
    body: 'welcome → workspace → demo offer → SetupProgressWidget. Apple Sign In + account deletion + 41 iOS tests.',
  },
];

export function V2ChangelogTimeline() {
  return (
    <div>
      {ENTRIES.map((e) => (
        <article key={e.date} className={`changelog-entry-row${e.major ? ' major' : ''}`}>
          <div className="date">
            {e.date}
            {e.major ? <span className="major-tag">Major</span> : null}
          </div>
          <h3>{e.title}</h3>
          <p>{e.body}</p>
        </article>
      ))}
    </div>
  );
}
