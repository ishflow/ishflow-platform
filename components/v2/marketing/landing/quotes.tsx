type Quote = {
  text: string;
  name: string;
  role: string;
  initials: string;
};

const QUOTES: Quote[] = [
  {
    text: "1C'den çıkmadan yıllarca tuttuğum alışkanlık burada parmak ucumda. Stok hareketi gerçekten 'bırak ve unut' kıvamında.",
    name: 'Aydar Naimov',
    role: 'CFO · Naimov Trading, Bişkek',
    initials: 'AN',
  },
  {
    text: "Excel'siz ilk ayım. Müşteri bakiyesini 1 dakikada çıkarıyorum — eski sistemde 20 dakika sürerdi.",
    name: 'Esra Kılıç',
    role: 'Muhasebe · Vatan Bilgisayar, İstanbul',
    initials: 'EK',
  },
];

export function V2LandingQuotes() {
  return (
    <section className="section container">
      <div className="section-hd">
        <div className="eyebrow">Geri Bildirim</div>
        <h2>Sahaya inmiş işletmeci sözü</h2>
      </div>
      <div className="quote-row">
        {QUOTES.map((q) => (
          <div key={q.name} className="quote-card">
            <p>{q.text}</p>
            <div className="who">
              <div className="avatar">{q.initials}</div>
              <div>
                <div className="name">{q.name}</div>
                <div className="role">{q.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
