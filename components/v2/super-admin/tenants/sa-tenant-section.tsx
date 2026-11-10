import type { ReactNode } from 'react';

/**
 * Standard card section used across tenant sub-tabs. Pulls header pattern
 * from variant-9 `.card` + `.card-header` so each sub-tab body is just
 * `<SaTenantSection title=…>{children}</SaTenantSection>`.
 */
export function SaTenantSection({
  title,
  action,
  subtitle,
  children,
}: {
  title: string;
  action?: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        {action ? <div>{action}</div> : null}
        {subtitle && !action ? (
          <span className="dim" style={{ fontSize: 12 }}>
            {subtitle}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Two-column key/value row used inside SaTenantSection cards. Mirrors the
 * `.info-row` markup from sa-tenant-detay overview.
 */
export function SaTenantInfoRow({
  k,
  v,
  mono,
}: {
  k: string;
  v: ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: 14,
        padding: '10px 0',
        borderTop: '1px solid var(--border)',
        fontSize: 13.5,
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 12.5 }}>{k}</div>
      <div
        style={
          mono
            ? { fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }
            : { fontWeight: 500 }
        }
      >
        {v}
      </div>
    </div>
  );
}
