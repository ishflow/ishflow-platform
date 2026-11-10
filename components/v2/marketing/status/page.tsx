import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export type StatusPageProps = {
  code?: string;
  Icon?: LucideIcon;
  title: string;
  description: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  meta?: string;
};

export function V2StatusPage({
  code,
  Icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  meta,
}: StatusPageProps) {
  return (
    <div className="status-card">
      {code ? <div className="status-code">{code}</div> : null}
      {Icon ? (
        <div className="status-glyph">
          <Icon size={28} strokeWidth={1.75} />
        </div>
      ) : null}
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="status-actions">
        {primaryCta ? (
          <Link className="btn btn-primary" href={primaryCta.href}>
            {primaryCta.label}
          </Link>
        ) : null}
        {secondaryCta ? (
          <Link className="btn btn-secondary" href={secondaryCta.href}>
            {secondaryCta.label}
          </Link>
        ) : null}
      </div>
      {meta ? <div className="status-meta">{meta}</div> : null}
    </div>
  );
}
