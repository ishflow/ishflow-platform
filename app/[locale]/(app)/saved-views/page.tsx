import { V2SavedViewsShell } from '@/components/v2/data/saved-views-shell';
import { V2SavedViewsSide } from '@/components/v2/data/saved-views-side';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

/**
 * V2 Saved Views — variant-9 parity (mockup: kayitli-gorunum-liste.html).
 *
 * Renders the active-view banner, a side panel of saved views (grouped by
 * scope), and a representative table card. Hosts the filter-builder modal +
 * save-view modal — opened from the banner/toolbar buttons via the
 * V2SavedViewsShell client wrapper.
 */
export default async function V2SavedViewsPage() {
  const t = await getTranslations('v2_data.savedViews');
  const c = await getTranslations('v2_data.common');

  return (
    <>
      <V2Topbar
        breadcrumb={t('breadcrumb')}
        title={t('activeViewName')}
        subtitle={t('activeViewMeta', { count: 12 })}
      />
      <div className="content">
        <div className="active-view-banner">
          <div>
            <span className="label">
              {t('banner.activePrefix')}: {t('activeViewName')}
            </span>
            <span className="badges">
              <span className="pill pill-info" style={{ fontSize: 10.5 }}>
                {t('activeViewName')}
              </span>
              <span className="pill pill-neutral" style={{ fontSize: 10.5 }}>
                {t('banner.activeState')}
              </span>
              <span className="pill pill-neutral" style={{ fontSize: 10.5 }}>
                {t('banner.sortByStockAsc')}
              </span>
            </span>
          </div>
          <div className="right">
            <V2SavedViewsShell
              triggers={{
                editFilterLabel: t('triggers.editFilter'),
                saveCurrentLabel: t('triggers.saveCurrent'),
                closeViewLabel: t('triggers.closeView'),
                updateLabel: t('triggers.updateView'),
              }}
              filterLabels={{
                title: t('filter.title'),
                subtitle: t('filter.subtitle'),
                resultPrefix: t('filter.resultPrefix'),
                resultSuffix: t('filter.resultSuffix'),
                addCondition: t('filter.addCondition'),
                addGroup: t('filter.addGroup'),
                apply: t('filter.apply'),
                cancel: c('cancel'),
                save: c('save'),
              }}
              filterResultCount="23"
              filterRoot={{
                id: 'root',
                scopeLabel: t('filter.rootGroupLabel'),
                logic: 'AND',
                logicHint: t('filter.hintAnd'),
                rules: [
                  {
                    id: 'r1',
                    field: t('filter.field.category'),
                    op: t('filter.op.equals'),
                    value: 'Telefon, Bilgisayar',
                  },
                  {
                    id: 'r2',
                    field: t('filter.field.status'),
                    op: t('filter.op.equals'),
                    value: t('filter.value.active'),
                  },
                ],
                nested: [
                  {
                    id: 'inner',
                    scopeLabel: t('filter.innerGroupLabel'),
                    logic: 'OR',
                    logicHint: t('filter.hintOr'),
                    rules: [
                      {
                        id: 'r3',
                        field: t('filter.field.stock'),
                        op: t('filter.op.lt'),
                        value: '10',
                      },
                      {
                        id: 'r4',
                        field: t('filter.field.margin'),
                        op: t('filter.op.lt'),
                        value: '15',
                      },
                    ],
                  },
                ],
              }}
              saveLabels={{
                title: t('save.title'),
                subtitle: t('save.subtitle'),
                nameLabel: t('save.nameLabel'),
                namePlaceholder: t('save.namePlaceholder'),
                scopeLabel: t('save.scopeLabel'),
                scopePrivate: t('save.scopePrivate'),
                scopeShared: t('save.scopeShared'),
                pinLabel: t('save.pinLabel'),
                cancel: c('cancel'),
                save: c('save'),
              }}
            />
          </div>
        </div>

        <div className="views-shell">
          <V2SavedViewsSide
            title={t('side.title')}
            newLabel={t('side.new')}
            sharedLabel={t('side.sharedTag')}
            groups={[
              {
                scopeLabel: t('side.scope.pinned'),
                items: [
                  {
                    id: 'low',
                    icon: 'alertCircle',
                    name: t('side.items.lowStock'),
                    meta: t('side.items.metaResults', { count: 12 }),
                    active: true,
                    starred: true,
                  },
                ],
              },
              {
                scopeLabel: t('side.scope.personal'),
                items: [
                  {
                    id: 'm',
                    icon: 'trendingUp',
                    name: t('side.items.thisMonth'),
                    meta: t('side.items.metaResults', { count: 84 }),
                    showEdit: true,
                    showDelete: true,
                  },
                  {
                    id: 'cat',
                    icon: 'package',
                    name: t('side.items.phoneCategory'),
                    meta: t('side.items.metaResults', { count: 42 }),
                    showEdit: true,
                    showShare: true,
                    showDelete: true,
                  },
                  {
                    id: 'arch',
                    icon: 'archive',
                    name: t('side.items.archived'),
                    meta: t('side.items.metaResults', { count: 11 }),
                  },
                ],
              },
              {
                scopeLabel: t('side.scope.team'),
                items: [
                  {
                    id: 'vip',
                    icon: 'star',
                    name: t('side.items.vip'),
                    meta: t('side.items.metaResults', { count: 8 }),
                    isShared: true,
                  },
                  {
                    id: 'overdue',
                    icon: 'alertTriangle',
                    name: t('side.items.overdueAR'),
                    meta: t('side.items.metaResults', { count: 5 }),
                    isShared: true,
                  },
                  {
                    id: 'lowMargin',
                    icon: 'dollar',
                    name: t('side.items.lowMargin'),
                    meta: t('side.items.metaResults', { count: 23 }),
                    isShared: true,
                  },
                  {
                    id: 'fast',
                    icon: 'zap',
                    name: t('side.items.fastMoving'),
                    meta: t('side.items.metaResults', { count: 20 }),
                    isShared: true,
                  },
                ],
              },
              {
                scopeLabel: t('side.scope.system'),
                items: [
                  {
                    id: 'all',
                    icon: 'lock',
                    name: t('side.items.allDefault'),
                    meta: t('side.items.metaResults', { count: 328 }),
                  },
                ],
              },
            ]}
          />

          <section className="table-card">
            <div className="table-toolbar">
              <div className="left">
                <div className="chip-row">
                  <button type="button" className="chip is-active">
                    {t('banner.activePrefix')}: {t('activeViewName')}
                  </button>
                </div>
              </div>
              <div className="right">
                <button type="button" className="btn btn-secondary btn-sm">
                  {c('export')}
                </button>
              </div>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>{t('table.col.sku')}</th>
                  <th>{t('table.col.name')}</th>
                  <th>{t('table.col.category')}</th>
                  <th className="num">{t('table.col.stock')}</th>
                  <th>{t('table.col.supplier')}</th>
                  <th className="num">{t('table.col.listPrice')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">SKU-0142</td>
                  <td>
                    <div className="row-title">Asus ROG Strix G16</div>
                    <div className="row-sub">Bilgisayar · i9</div>
                  </td>
                  <td>
                    <span className="pill pill-neutral">Bilgisayar</span>
                  </td>
                  <td className="num">
                    <span className="pill pill-danger">1</span>
                  </td>
                  <td>Acme Supply Co.</td>
                  <td className="num">$2,899.00</td>
                </tr>
                <tr>
                  <td className="mono">SKU-0003</td>
                  <td>
                    <div className="row-title">MacBook Pro 14</div>
                    <div className="row-sub">Bilgisayar · M3 Pro</div>
                  </td>
                  <td>
                    <span className="pill pill-neutral">Bilgisayar</span>
                  </td>
                  <td className="num">
                    <span className="pill pill-warning">4</span>
                  </td>
                  <td>Vatan Bilgisayar</td>
                  <td className="num">$2,499.00</td>
                </tr>
                <tr>
                  <td className="mono">SKU-0089</td>
                  <td>
                    <div className="row-title">Sony Camera α7 IV</div>
                    <div className="row-sub">Görüntü</div>
                  </td>
                  <td>
                    <span className="pill pill-neutral">Görüntü</span>
                  </td>
                  <td className="num">
                    <span className="pill pill-warning">5</span>
                  </td>
                  <td>Sony Trade</td>
                  <td className="num">$2,499.00</td>
                </tr>
                <tr>
                  <td className="mono">SKU-0007</td>
                  <td>
                    <div className="row-title">Sony WH-1000XM6</div>
                    <div className="row-sub">Kulaklık</div>
                  </td>
                  <td>
                    <span className="pill pill-neutral">Aksesuar</span>
                  </td>
                  <td className="num">
                    <span className="pill pill-warning">7</span>
                  </td>
                  <td>Sony Trade</td>
                  <td className="num">$399.00</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </>
  );
}
