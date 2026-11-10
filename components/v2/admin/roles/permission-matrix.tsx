import { Check } from 'lucide-react';

export type PermAction = 'on' | 'off' | 'na';
export type PermRow = { module: string; sub?: string; actions: PermAction[] };

export type PermissionMatrixProps = {
  labels: {
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
  counts: { active: number; total: number };
  rows: PermRow[];
};

export function V2PermissionMatrix(p: PermissionMatrixProps) {
  return (
    <>
      <div className="card-header" style={{ padding: '0 0 12px' }}>
        <div className="card-title">{p.labels.title}</div>
        <div className="dim" style={{ fontSize: 12 }}>
          {p.labels.counterLabel} {p.counts.active} / {p.counts.total}
        </div>
      </div>
      <table className="perm-table">
        <thead>
          <tr>
            <th>{p.labels.cols.module}</th>
            <th className="col">{p.labels.cols.read}</th>
            <th className="col">{p.labels.cols.create}</th>
            <th className="col">{p.labels.cols.update}</th>
            <th className="col">{p.labels.cols.delete}</th>
            <th className="col">{p.labels.cols.post}</th>
          </tr>
        </thead>
        <tbody>
          {p.rows.map((r) => (
            <tr key={r.module}>
              <td>
                <div className="mod-name">{r.module}</div>
                {r.sub ? <div className="mod-sub">{r.sub}</div> : null}
              </td>
              {r.actions.map((a, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 5 fixed permission columns (read/create/update/delete/post)
                <td className="col" key={idx}>
                  <span className={`cbx${a === 'on' ? ' is-on' : a === 'na' ? ' is-na' : ''}`}>
                    {a === 'na' ? null : <Check size={12} strokeWidth={3} />}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
