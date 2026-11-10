import { ExternalLink } from 'lucide-react';

export type TopCustomerItem = {
  initials: string;
  name: string;
  amount: string;
  percentage: number;
};

export type TopCustomersProps = {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  totalCountLabel: string;
  changePct: number;
  customers: TopCustomerItem[];
};

export function V2TopCustomers({
  title,
  viewAllHref,
  viewAllLabel,
  totalCountLabel,
  changePct,
  customers,
}: TopCustomersProps) {
  const isUp = changePct >= 0;
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <a className="card-link" href={viewAllHref}>
          {viewAllLabel}
          <ExternalLink size={14} strokeWidth={1.75} />
        </a>
      </div>
      <div className="chart-value" style={{ fontSize: 24, marginBottom: 12 }}>
        {totalCountLabel}
        <span className="badge">
          {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(1)}%
        </span>
      </div>
      {customers.map((c) => (
        <div className="list-row" key={c.name}>
          <div className="avatar">{c.initials}</div>
          <div className="body">
            <div className="name">{c.name}</div>
            <div className="progress">
              <div className="fill" style={{ width: `${c.percentage}%` }} />
            </div>
          </div>
          <div className="num">
            {c.amount} <span className="pct">({c.percentage}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}
