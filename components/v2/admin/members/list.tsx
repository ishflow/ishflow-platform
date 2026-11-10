import { Filter, Mail, Search, Send, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { InviteRowActions, MemberRoleSelect, MemberRowMenu } from './row-actions';

export type MemberRow = {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  role: string;
  roleTone: 'info' | 'neutral';
  /** Current primary role id — drives the manager-only role selector. */
  roleId: string;
  lastSeen: string;
  isYou?: boolean;
};

export type RoleOption = { id: string; name: string; label: string };

export type InviteRow = {
  id: string;
  email: string;
  systemRole: string;
  invitedBy: string;
  invitedAt: string;
  role: string;
  roleTone: 'info' | 'neutral';
  ageLabel: string;
};

export type MembersListProps = {
  labels: {
    chipActive: string;
    chipAllRoles: string;
    chipSuspended: string;
    searchPh: string;
    filterRole: string;
    invite: string;
    columns: { name: string; email: string; role: string; lastSeen: string; status: string };
    youSuffix: string;
    statusActive: string;
    pageInfo: string;
    invitesTitle: string;
    invitesRefresh: string;
    invitesInviteCta: string;
    invitesResend: string;
    invitesCancelAria: string;
    removeMember: string;
    removeMemberConfirm: string;
    rowMenuAria: string;
  };
  counts: { active: number; suspended: number; invites: number };
  members: MemberRow[];
  invites: InviteRow[];
  inviteHref: string;
  /** Assignable roles for the per-row selector (managers only). */
  roleOptions?: RoleOption[];
  /** Whether the viewer may change roles (`admin.members:manage`). */
  canManage?: boolean;
};

export function V2MembersList(p: MembersListProps) {
  return (
    <>
      <section className="table-card">
        <div className="table-toolbar">
          <div className="left">
            <div className="chip-row">
              <button type="button" className="chip is-active">
                {p.labels.chipActive} <span className="count">{p.counts.active}</span>
              </button>
              <button type="button" className="chip">
                {p.labels.chipAllRoles}
              </button>
              <button type="button" className="chip">
                {p.labels.chipSuspended} <span className="count">{p.counts.suspended}</span>
              </button>
            </div>
          </div>
          <div className="right">
            <div className="search-input">
              <Search size={14} strokeWidth={1.75} />
              <input type="text" placeholder={p.labels.searchPh} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm">
              <Filter size={14} strokeWidth={1.75} />
              {p.labels.filterRole}
            </button>
            <Link href={p.inviteHref} className="btn btn-primary btn-sm">
              <UserPlus size={14} strokeWidth={1.75} />
              {p.labels.invite}
            </Link>
          </div>
        </div>

        <table className="data">
          <thead>
            <tr>
              <th>{p.labels.columns.name}</th>
              <th>{p.labels.columns.email}</th>
              <th>{p.labels.columns.role}</th>
              <th>{p.labels.columns.lastSeen}</th>
              <th>{p.labels.columns.status}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="av-cell">
                    <div className="av" style={{ background: m.color }}>
                      {m.initials}
                    </div>
                    <div>
                      <div className="row-title">
                        {m.name}
                        {m.isYou ? <span className="dim"> ({p.labels.youSuffix})</span> : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="mono">{m.email}</td>
                <td>
                  {p.canManage && p.roleOptions?.some((o) => o.id === m.roleId) ? (
                    <MemberRoleSelect
                      membershipId={m.id}
                      currentRoleId={m.roleId}
                      options={p.roleOptions}
                      ariaLabel={p.labels.columns.role}
                    />
                  ) : (
                    <span className={`pill pill-${m.roleTone}`}>{m.role}</span>
                  )}
                </td>
                <td>{m.lastSeen}</td>
                <td>
                  <span className="pill pill-success">{p.labels.statusActive}</span>
                </td>
                <td>
                  <MemberRowMenu
                    membershipId={m.id}
                    isYou={m.isYou}
                    removeLabel={p.labels.removeMember}
                    removeConfirm={p.labels.removeMemberConfirm}
                    menuAria={p.labels.rowMenuAria}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="table-footer">
          <div>{p.labels.pageInfo}</div>
          <div className="pager">
            <span className="pg is-active">1</span>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="section-head">
          <div className="title">
            <Send size={14} strokeWidth={1.75} />
            {p.labels.invitesTitle}
            <span className="count">{p.counts.invites}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm">
              {p.labels.invitesRefresh}
            </button>
            <Link href={p.inviteHref} className="btn btn-secondary btn-sm">
              <UserPlus size={14} strokeWidth={1.75} />
              {p.labels.invitesInviteCta}
            </Link>
          </div>
        </div>

        {p.invites.map((inv) => (
          <div key={inv.id} className="invite-row">
            <div className="who">
              <div className="icon">
                <Mail size={14} strokeWidth={1.75} />
              </div>
              <div>
                <div className="em">{inv.email}</div>
                <div className="sub">
                  {inv.invitedBy} · {inv.invitedAt}
                </div>
              </div>
            </div>
            <span className={`pill pill-${inv.roleTone}`}>{inv.role}</span>
            <span className="meta">{inv.ageLabel}</span>
            <InviteRowActions
              invitationId={inv.id}
              email={inv.email}
              systemRole={inv.systemRole}
              resendLabel={p.labels.invitesResend}
              cancelAria={p.labels.invitesCancelAria}
            />
          </div>
        ))}
      </section>
    </>
  );
}
