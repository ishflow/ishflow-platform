import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { getTranslations } from 'next-intl/server';
import type React from 'react';
import { createComms } from '../_actions';
import { getSaCommsDict } from '../_sa-dict';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  fontSize: 13,
};

/**
 * Super-admin new announcement — a real create form posting to `createComms`,
 * which writes a draft `marketingAnnouncement` (+ default-locale translation +
 * audit log) and redirects to its detail page to publish. No fake "schedule
 * send"; announcements are drafted then published in-app.
 */
export default async function SaCommsNewPage() {
  const [t, d] = await Promise.all([
    getTranslations('v2_super_admin.comms.newForm'),
    getSaCommsDict(),
  ]);

  return (
    <form action={createComms}>
      <SaCmsPageShell
        topbar={
          <SaTopbar
            breadcrumb={t('breadcrumb')}
            title={t('title')}
            subtitle={t('subtitle')}
            actions={
              <button type="submit" className="btn btn-primary btn-sm">
                {d.actions.saveDraft}
              </button>
            }
          />
        }
      >
        <SaTenantSection title={d.form.sectionMeta}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            <input
              name="internalKey"
              type="text"
              required
              placeholder={d.form.internalKey}
              style={{ ...fieldStyle, fontFamily: 'var(--font-mono)' }}
            />
            <span className="dim" style={{ fontSize: 12 }}>
              {d.form.internalKeyHint}
            </span>
            <select name="surface" defaultValue="banner" style={fieldStyle}>
              <option value="banner">{d.surfaces.banner}</option>
              <option value="popup">{d.surfaces.popup}</option>
              <option value="feed_only">{d.surfaces.feed_only}</option>
            </select>
          </div>
        </SaTenantSection>

        <div className="spacer" />

        <SaTenantSection title={d.form.sectionTranslations}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            <input
              name="title"
              type="text"
              required
              placeholder={d.form.title}
              style={{ ...fieldStyle, fontWeight: 600 }}
            />
            <textarea
              name="body"
              rows={12}
              placeholder={d.form.body}
              style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
            />
            <span className="dim" style={{ fontSize: 12 }}>
              {d.form.bodyHint}
            </span>
          </div>
        </SaTenantSection>
      </SaCmsPageShell>
    </form>
  );
}
