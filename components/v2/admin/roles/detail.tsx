import { Copy, ExternalLink, MoreHorizontal, Plus, Save, Shield, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { type PermRow, V2PermissionMatrix } from './permission-matrix';

export type RoleMember = {
  initials: string;
  color: string;
  name: string;
  email: string;
  lastSeen: string;
};

export type ScopeRow = {
  entity: string;
  entitySub?: string;
  filter: React.ReactNode;
  actions: Array<{ label: string; tone: 'success' | 'warning' | 'neutral' }>;
};

export type RoleDetailProps = {
  isSystem?: boolean;
  labels: {
    systemAlertTitle: string;
    systemAlertBody: string;
    systemAlertCopy: string;
    saveCta: string;
    cancel: string;
    lastUpdated: string;
    fields: {
      sectionTitle: string;
      name: string;
      nameRu: string;
      description: string;
      scope: string;
      scopeAll: string;
      scopeAssigned: string;
    };
    permission: {
      title: string;
      counterLabel: string;
      cols: {
        module: string;
        read: string;
        create: string;
        update: string;
        delete: string;
        post: string;
      };
    };
    scopeSection: {
      title: string;
      desc: string;
      cols: { entity: string; filter: string; appliedActions: string };
      addRuleCta: string;
    };
    membersSection: {
      title: string;
      viewAll: string;
      meta: (when: string) => string;
      addMemberCta: string;
    };
  };
  defaults: { name: string; nameRu: string; description: string };
  permissionRows: PermRow[];
  permissionCounts: { active: number; total: number };
  scopeRows: ScopeRow[];
  members: RoleMember[];
};

export function V2RoleDetail(p: RoleDetailProps) {
  return (
    <>
      {p.isSystem ? (
        <div className="system-alert">
          <div className="ico">
            <Shield size={18} strokeWidth={1.75} />
          </div>
          <div>
            <div className="ttl">{p.labels.systemAlertTitle}</div>
            <div className="body">{p.labels.systemAlertBody}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm">
            <Copy size={14} strokeWidth={1.75} />
            {p.labels.systemAlertCopy}
          </button>
        </div>
      ) : null}

      <div className="action-bar">
        <div className="left">
          <button type="button" className="btn btn-primary">
            <Save size={14} strokeWidth={1.75} />
            {p.labels.saveCta}
          </button>
          <button type="button" className="btn btn-ghost">
            {p.labels.cancel}
          </button>
        </div>
        <div className="right">{p.labels.lastUpdated}</div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">{p.labels.fields.sectionTitle}</div>
          </div>
          <div className="form-grid">
            <label htmlFor="role-name">{p.labels.fields.name}</label>
            <div className="field">
              <input
                id="role-name"
                className="input"
                defaultValue={p.defaults.name}
                disabled={p.isSystem}
              />
            </div>

            <label htmlFor="role-name-ru">{p.labels.fields.nameRu}</label>
            <div className="field">
              <input
                id="role-name-ru"
                className="input"
                defaultValue={p.defaults.nameRu}
                disabled={p.isSystem}
              />
            </div>

            <label htmlFor="role-desc">{p.labels.fields.description}</label>
            <div className="field">
              <textarea
                id="role-desc"
                className="textarea"
                rows={3}
                defaultValue={p.defaults.description}
                disabled={p.isSystem}
              />
            </div>

            {/* biome-ignore lint/a11y/noLabelWithoutControl: form-grid label paired with sibling chip-row buttons */}
            <label>{p.labels.fields.scope}</label>
            <div className="field">
              <div
                className="chip-row"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              >
                <button type="button" className="chip is-active">
                  {p.labels.fields.scopeAll}
                </button>
                <button type="button" className="chip">
                  {p.labels.fields.scopeAssigned}
                </button>
              </div>
            </div>
          </div>

          <div className="spacer" />

          <V2PermissionMatrix
            labels={p.labels.permission}
            counts={p.permissionCounts}
            rows={p.permissionRows}
          />

          <div className="spacer" />

          <div className="card-header" style={{ padding: '0 0 12px' }}>
            <div className="card-title">{p.labels.scopeSection.title}</div>
            <div className="dim" style={{ fontSize: 12 }}>
              {p.labels.scopeSection.desc}
            </div>
          </div>
          <table className="scope-table">
            <thead>
              <tr>
                <th>{p.labels.scopeSection.cols.entity}</th>
                <th>{p.labels.scopeSection.cols.filter}</th>
                <th>{p.labels.scopeSection.cols.appliedActions}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.scopeRows.map((row) => (
                <tr key={row.entity}>
                  <td>
                    <div className="ent">{row.entity}</div>
                    {row.entitySub ? (
                      <div className="dim" style={{ fontSize: 11.5 }}>
                        {row.entitySub}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className="filter">{row.filter}</span>
                  </td>
                  <td>
                    <div className="actions">
                      {row.actions.map((a) => (
                        <span key={a.label} className={`pill pill-${a.tone}`}>
                          {a.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button type="button" className="row-menu" aria-label="Scope menu">
                      <MoreHorizontal size={14} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm">
              <Plus size={14} strokeWidth={1.75} />
              {p.labels.scopeSection.addRuleCta}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">{p.labels.membersSection.title}</div>
            <Link className="card-link" href="/admin/members">
              {p.labels.membersSection.viewAll}
              <ExternalLink size={12} strokeWidth={1.75} style={{ marginLeft: 4 }} />
            </Link>
          </div>
          {p.members.map((m) => (
            <div key={m.email} className="list-row">
              <div className="avatar" style={{ background: m.color, color: 'white' }}>
                {m.initials}
              </div>
              <div className="body">
                <div className="name">{m.name}</div>
                <div className="meta">
                  {p.labels.membersSection.meta(`${m.email} · ${m.lastSeen}`)}
                </div>
              </div>
            </div>
          ))}
          <div className="spacer" />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <UserPlus size={14} strokeWidth={1.75} />
            {p.labels.membersSection.addMemberCta}
          </button>
        </section>
      </div>
    </>
  );
}
