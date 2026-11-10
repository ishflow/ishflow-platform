import './data.css';

/**
 * Register loading skeleton — mirrors loading-register.html.
 *
 * Pure presentation, no client state. Filter bar + table + summary cards.
 */
const HEADER_KEYS = [
  'h-no',
  'h-status',
  'h-date',
  'h-partner',
  'h-warehouse',
  'h-amount',
  'h-actions',
];
const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10'];
const SUM_KEYS = ['ar', 'ap', 'stock', 'sales'];

export function V2RegisterSkeleton() {
  return (
    <div className="content">
      <section className="table-card">
        <div className="filter-bar-sk">
          <div className="left">
            <span className="sk sk-pill" style={{ width: 88 }} />
            <span className="sk sk-pill" style={{ width: 108 }} />
            <span className="sk sk-pill" style={{ width: 96 }} />
            <span className="sk sk-pill" style={{ width: 118 }} />
            <span className="sk sk-pill" style={{ width: 74 }} />
          </div>
          <div className="right">
            <span className="sk" style={{ width: 240, height: 32, borderRadius: 8 }} />
            <span className="sk" style={{ width: 108, height: 32, borderRadius: 8 }} />
          </div>
        </div>
        <table className="sk-tbl">
          <thead>
            <tr>
              {HEADER_KEYS.map((k) => (
                <th key={k}>
                  <span className="sk" style={{ width: 64, height: 11 }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_KEYS.map((k) => (
              <tr key={k}>
                <td>
                  <span className="sk" style={{ width: 78, height: 11 }} />
                </td>
                <td>
                  <span className="sk" style={{ width: 140, height: 11 }} />
                </td>
                <td>
                  <span className="sk sk-pill" style={{ width: 76, height: 20 }} />
                </td>
                <td>
                  <span className="sk" style={{ width: '58%', height: 11 }} />
                </td>
                <td className="num">
                  <span className="sk" style={{ width: 46, height: 11 }} />
                </td>
                <td className="num">
                  <span className="sk" style={{ width: 74, height: 11 }} />
                </td>
                <td>
                  <span className="sk" style={{ width: 24, height: 11 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sum-card">
        {SUM_KEYS.map((k) => (
          <div className="it" key={k}>
            <span className="sk" style={{ width: '60%', height: 11 }} />
            <span className="sk" style={{ width: '75%', height: 22 }} />
            <span className="sk" style={{ width: '45%', height: 11 }} />
          </div>
        ))}
      </section>
    </div>
  );
}
