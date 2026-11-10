import {
  AlertCircle,
  AlertTriangle,
  Archive,
  DollarSign,
  Edit3,
  Lock,
  type LucideIcon,
  Package,
  Plus,
  Share2,
  Star,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import './data.css';

export type SavedViewItem = {
  id: string;
  icon: keyof typeof ICONS;
  name: string;
  meta: string;
  isShared?: boolean;
  active?: boolean;
  starred?: boolean;
  showEdit?: boolean;
  showShare?: boolean;
  showDelete?: boolean;
};

export type SavedViewGroup = {
  scopeLabel: string;
  items: SavedViewItem[];
};

const ICONS = {
  trendingUp: TrendingUp,
  package: Package,
  archive: Archive,
  star: Star,
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  dollar: DollarSign,
  zap: Zap,
  lock: Lock,
} satisfies Record<string, LucideIcon>;

export function V2SavedViewsSide({
  title,
  newLabel,
  sharedLabel,
  groups,
  onNew,
}: {
  title: string;
  newLabel: string;
  /** "shared" badge text (e.g. "paylaşıldı") */
  sharedLabel: string;
  groups: SavedViewGroup[];
  onNew?: () => void;
}) {
  return (
    <aside className="views-side">
      <div className="head">
        <h3>{title}</h3>
        <button type="button" className="add" onClick={onNew}>
          <Plus size={12} strokeWidth={1.75} />
          {newLabel}
        </button>
      </div>
      {groups.map((group) => (
        <div key={group.scopeLabel}>
          <div className="scope">{group.scopeLabel}</div>
          {group.items.map((it) => {
            const Icon = ICONS[it.icon] ?? AlertCircle;
            return (
              <div key={it.id} className={`sv-item${it.active ? ' is-active' : ''}`}>
                <span className="sv-icon">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <div className="info">
                  <div>{it.name}</div>
                  <div className="meta">
                    {it.meta}
                    {it.isShared ? <span className="share-tag">{sharedLabel}</span> : null}
                  </div>
                </div>
                {it.starred ? (
                  <span className="star" aria-hidden>
                    <Star size={14} strokeWidth={1.75} />
                  </span>
                ) : (
                  <div className="actions">
                    {it.showEdit ? (
                      <button type="button" aria-label="edit">
                        <Edit3 size={12} strokeWidth={1.75} />
                      </button>
                    ) : null}
                    {it.showShare ? (
                      <button type="button" aria-label="share">
                        <Share2 size={12} strokeWidth={1.75} />
                      </button>
                    ) : null}
                    {it.showDelete ? (
                      <button type="button" aria-label="delete">
                        <Trash2 size={12} strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
