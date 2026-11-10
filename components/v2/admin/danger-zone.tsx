import { AlertOctagon, Archive, ArrowRightCircle, Download, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

export type V2DangerZoneProps = {
  labels: {
    introTitle: string;
    introBody: string;
    transfer: {
      title: string;
      name: string;
      desc: string;
      cta: string;
    };
    archive: {
      title: string;
      name: string;
      desc: string;
      confirmHint: string;
      cta: string;
    };
    deleteWs: {
      title: string;
      name: string;
      desc: string;
      confirmHint: string;
      cta: string;
    };
    exportAll: {
      title: string;
      pillSoon: string;
      name: string;
      desc: string;
      cta: string;
    };
    tenantSlugPh: string;
  };
};

export function V2DangerZone(p: V2DangerZoneProps) {
  return (
    <>
      <section
        className="card"
        style={{
          background: 'color-mix(in srgb, var(--danger-text) 6%, var(--surface))',
          borderColor: 'color-mix(in srgb, var(--danger-text) 30%, var(--border))',
        }}
      >
        <div
          className="card-title"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <AlertOctagon size={16} strokeWidth={1.75} style={{ color: 'var(--danger-text)' }} />
          {p.labels.introTitle}
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text)' }}>{p.labels.introBody}</p>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div
            className="card-title"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <ArrowRightCircle size={16} strokeWidth={1.75} />
            {p.labels.transfer.title}
          </div>
        </div>
        <div className="danger-card">
          <div className="text">
            <div className="title">{p.labels.transfer.name}</div>
            <div className="desc">{p.labels.transfer.desc}</div>
          </div>
          <Link href="/admin/members" className="btn btn-secondary">
            <Users size={14} strokeWidth={1.75} />
            {p.labels.transfer.cta}
          </Link>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div
            className="card-title"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <Archive size={16} strokeWidth={1.75} />
            {p.labels.archive.title}
          </div>
        </div>
        <div className="danger-card">
          <div className="text">
            <div className="title">{p.labels.archive.name}</div>
            <div className="desc">{p.labels.archive.desc}</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="dim" style={{ fontSize: 12 }}>
                {p.labels.archive.confirmHint}
              </span>
              <input
                className="input mono"
                placeholder={p.labels.tenantSlugPh}
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <button type="button" className="btn btn-secondary">
            {p.labels.archive.cta}
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div
            className="card-title"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--danger-text)',
            }}
          >
            <Trash2 size={16} strokeWidth={1.75} />
            {p.labels.deleteWs.title}
          </div>
        </div>
        <div className="danger-card">
          <div className="text">
            <div className="title">{p.labels.deleteWs.name}</div>
            <div className="desc">{p.labels.deleteWs.desc}</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="dim" style={{ fontSize: 12 }}>
                {p.labels.deleteWs.confirmHint}
              </span>
              <input
                className="input mono"
                placeholder={p.labels.tenantSlugPh}
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <button type="button" className="btn btn-danger">
            {p.labels.deleteWs.cta}
          </button>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div
            className="card-title"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            <Download size={16} strokeWidth={1.75} />
            {p.labels.exportAll.title}
          </div>
          <span className="pill pill-neutral">{p.labels.exportAll.pillSoon}</span>
        </div>
        <div className="danger-card">
          <div className="text">
            <div className="title">{p.labels.exportAll.name}</div>
            <div className="desc">{p.labels.exportAll.desc}</div>
          </div>
          <button type="button" className="btn btn-secondary" disabled>
            {p.labels.exportAll.cta}
          </button>
        </div>
      </section>
    </>
  );
}
