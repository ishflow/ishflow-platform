import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import './data.css';

export type ReportCardProps = {
  icon: LucideIcon;
  name: string;
  desc: string;
  href: string;
};

export function V2ReportCard({ icon: Icon, name, desc, href }: ReportCardProps) {
  return (
    <Link className="report-card" href={href}>
      <div className="ico-wrap">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="info">
        <div className="name">{name}</div>
        <div className="desc">{desc}</div>
      </div>
      <span className="arrow">
        <ChevronRight size={16} strokeWidth={1.75} />
      </span>
    </Link>
  );
}
