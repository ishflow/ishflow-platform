import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import './data.css';

export type RankedListItem = {
  id: string;
  initials: string;
  name: string;
  meta: string;
  fillPct: number;
  amountLabel: string;
};

export type RankedListProps = {
  title: string;
  link?: { href: string; label: string };
  items: RankedListItem[];
  emptyLabel?: string;
};

export function V2RankedList({ title, link, items, emptyLabel }: RankedListProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        {link ? (
          <Link className="card-link" href={link.href}>
            {link.label}
            <ExternalLink size={12} strokeWidth={1.75} />
          </Link>
        ) : null}
      </div>
      {items.length === 0 && emptyLabel ? (
        <div className="muted" style={{ padding: 12, fontSize: 12.5 }}>
          {emptyLabel}
        </div>
      ) : null}
      {items.map((it) => (
        <div className="list-row" key={it.id}>
          <div className="avatar">{it.initials}</div>
          <div className="body">
            <div className="name">{it.name}</div>
            <div className="meta">{it.meta}</div>
            <div className="progress">
              <div
                className="fill"
                style={{ width: `${Math.max(0, Math.min(100, it.fillPct))}%` }}
              />
            </div>
          </div>
          <div className="num">{it.amountLabel}</div>
        </div>
      ))}
    </div>
  );
}
