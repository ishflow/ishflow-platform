import { FileSpreadsheet, FileText, Sparkles, Upload } from 'lucide-react';

export type SourceOption = {
  id: string;
  icon: 'csv' | 'xlsx' | '1c' | 'demo';
  title: string;
  desc: string;
};

export type V2OrgImportProps = {
  labels: {
    sectionTitle: string;
    sectionSub: string;
    sourcesTitle: string;
    sources: SourceOption[];
    dropTitle: string;
    dropMeta: string;
    progressLink: string;
  };
};

function SrcIcon({ kind }: { kind: SourceOption['icon'] }) {
  if (kind === 'csv') return <FileText size={20} strokeWidth={1.75} />;
  if (kind === 'xlsx') return <FileSpreadsheet size={20} strokeWidth={1.75} />;
  if (kind === 'demo') return <Sparkles size={20} strokeWidth={1.75} />;
  return <Upload size={20} strokeWidth={1.75} />;
}

export function V2OrgImport(p: V2OrgImportProps) {
  return (
    <>
      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.sourcesTitle}</div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          {p.labels.sources.map((s) => (
            <button
              key={s.id}
              type="button"
              style={{
                textAlign: 'left',
                padding: 16,
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--accent)' }}>
                <SrcIcon kind={s.icon} />
              </span>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.title}</div>
              <div className="dim" style={{ fontSize: 12 }}>
                {s.desc}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.sectionTitle}</div>
          <span className="dim" style={{ fontSize: 12 }}>
            {p.labels.sectionSub}
          </span>
        </div>
        <div className="drop-zone">
          <div className="ico">
            <Upload size={20} strokeWidth={1.75} />
          </div>
          <div className="label">{p.labels.dropTitle}</div>
          <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
            {p.labels.dropMeta}
          </div>
        </div>
      </section>

      <div className="spacer" />

      <div style={{ textAlign: 'right' }}>
        <a className="btn btn-ghost btn-sm" href="/admin/import/progress">
          {p.labels.progressLink}
        </a>
      </div>
    </>
  );
}
