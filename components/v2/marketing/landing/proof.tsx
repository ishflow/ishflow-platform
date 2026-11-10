type Stat = { num: string; label: string };

const STATS: Stat[] = [
  { num: '38', label: 'Erken erişim kuruluş' },
  { num: '12.4k', label: 'Geçirilen belge' },
  { num: '93%', label: '1C ekrandan tutarlılık' },
  { num: '8', label: 'Aktif dil' },
];

export function V2LandingProof() {
  return (
    <section className="section container">
      <div className="section-hd">
        <div className="eyebrow">Rakamlar</div>
        <h2>Ölçeği zaten taşıyor</h2>
      </div>
      <div className="proof-grid">
        {STATS.map((s) => (
          <div key={s.label} className="proof-card">
            <div className="num">{s.num}</div>
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
