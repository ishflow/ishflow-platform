/**
 * /dashboard loading skeleton.
 *
 * Renders inside the layout's `.v2-app > .app > main.main > .content` shell,
 * so we only need the inner section. Four dimmed KPI placeholders match the
 * grid shape Stream C will eventually wire.
 */
export default function V2DashboardLoading() {
  return (
    <section className="kpi-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="kpi" style={{ opacity: 0.5 }}>
          <div className="label">…</div>
          <div className="value">—</div>
        </div>
      ))}
    </section>
  );
}
