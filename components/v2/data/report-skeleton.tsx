import './data.css';

/**
 * Report loading skeleton — mirrors loading-rapor.html.
 *
 * KPI strip + chart card + table card.
 */
const KPI_KEYS = ['k1', 'k2', 'k3', 'k4'];
const HEADER_KEYS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
const COL_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5'];

export function V2ReportSkeleton() {
  return (
    <div className="content">
      <section className="sum-card">
        {KPI_KEYS.map((k) => (
          <div className="it" key={k}>
            <span className="sk" style={{ width: '60%', height: 11 }} />
            <span className="sk" style={{ width: '75%', height: 22 }} />
            <span className="sk" style={{ width: '45%', height: 11 }} />
          </div>
        ))}
      </section>

      <div className="spacer" />

      <section
        className="card"
        style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="sk" style={{ width: 180, height: 14 }} />
          <span className="sk" style={{ width: 96, height: 22 }} />
        </div>
        <span className="sk" style={{ width: 220, height: 28 }} />
        <span className="sk" style={{ width: '100%', height: 160, borderRadius: 8 }} />
      </section>

      <div className="spacer" />

      <section className="table-card">
        <div className="filter-bar-sk">
          <span className="sk" style={{ width: 200, height: 14 }} />
          <div className="right">
            <span className="sk sk-pill" style={{ width: 88 }} />
            <span className="sk sk-pill" style={{ width: 88 }} />
            <span className="sk sk-pill" style={{ width: 88 }} />
          </div>
        </div>
        <table className="sk-tbl">
          <thead>
            <tr>
              {HEADER_KEYS.map((k, i) => (
                <th key={k} className={i > 0 ? 'num' : undefined}>
                  <span className="sk" style={{ width: 64, height: 11 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_KEYS.map((rk) => (
              <tr key={rk}>
                <td>
                  <span className="sk" style={{ width: 140, height: 11 }} />
                </td>
                {COL_KEYS.map((ck) => (
                  <td key={`${rk}-${ck}`} className="num">
                    <span className="sk" style={{ width: 72, height: 11 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
