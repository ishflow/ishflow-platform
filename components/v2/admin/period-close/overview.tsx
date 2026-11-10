import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';

export type PeriodOverviewProps = {
  labels: {
    headTitle: string;
    headSub: string;
    statusPill: string;
    startCta: string;
    historyTitle: string;
    historyCols: { period: string; closedAt: string; closedBy: string };
    historyRows: Array<{ period: string; closedAt: string; closedBy: string; href: string }>;
    historyOpenLabel: string;
  };
};

export function V2PeriodOverview(p: PeriodOverviewProps) {
  return (
    <>
      <div className="period-tile">
        <div>
          <div className="head">{p.labels.headTitle}</div>
          <div className="sub">{p.labels.headSub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="pill pill-warning">{p.labels.statusPill}</span>
          <Link href="/admin/period-close/checklist" className="btn btn-primary">
            <Play size={14} strokeWidth={1.75} />
            {p.labels.startCta}
          </Link>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.historyTitle}</div>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>{p.labels.historyCols.period}</th>
              <th>{p.labels.historyCols.closedAt}</th>
              <th>{p.labels.historyCols.closedBy}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.labels.historyRows.map((row) => (
              <tr key={row.period}>
                <td style={{ fontWeight: 600 }}>{row.period}</td>
                <td>{row.closedAt}</td>
                <td>{row.closedBy}</td>
                <td>
                  <Link href={row.href} className="btn btn-ghost btn-sm">
                    {p.labels.historyOpenLabel}
                    <ArrowRight size={12} strokeWidth={1.75} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
