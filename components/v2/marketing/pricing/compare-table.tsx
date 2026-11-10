type Row = { feature: string; values: (string | 'tick' | 'dash')[] };

const ROWS: Row[] = [
  { feature: 'Kullanıcı', values: ['1', '5', '20', '∞'] },
  { feature: 'Belge / ay', values: ['500', '10.000', '∞', '∞'] },
  { feature: '1C import', values: ['tick', 'tick', 'tick', 'tick'] },
  { feature: 'Çoklu kiracı', values: ['dash', 'tick', 'tick', 'tick'] },
  { feature: 'API + Webhook', values: ['dash', 'tick', 'tick', 'tick'] },
  { feature: 'SSO', values: ['dash', 'dash', 'tick', 'tick'] },
  { feature: 'Dönem kapanışı + onay', values: ['dash', 'dash', 'tick', 'tick'] },
  { feature: 'SOC 2 raporu', values: ['dash', 'dash', 'dash', 'tick'] },
  { feature: 'VPC / on-prem', values: ['dash', 'dash', 'dash', 'tick'] },
  { feature: 'Destek', values: ['Topluluk', 'E-posta', 'Öncelikli', 'Özel TAM'] },
];

const COLUMN_LABELS = ['Free', 'Pro', 'Team', 'Enterprise'] as const;

export function V2PricingCompareTable() {
  return (
    <div className="compare-wrap">
      <h2>Plan karşılaştırması</h2>
      <table className="compare">
        <thead>
          <tr>
            <th>Özellik</th>
            {COLUMN_LABELS.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.feature}>
              <td className="col">{r.feature}</td>
              {r.values.map((v, idx) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: column position is the key
                  key={idx}
                  className={v === 'tick' ? 'tick' : v === 'dash' ? 'dash' : undefined}
                >
                  {v === 'tick' ? '✓' : v === 'dash' ? '—' : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
