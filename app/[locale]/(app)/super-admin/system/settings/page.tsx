import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { getTranslations } from 'next-intl/server';

export default async function SaSystemSettingsPage() {
  const t = await getTranslations('v2_super_admin.system.settings');
  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            <button type="button" className="btn btn-primary btn-sm">
              {t('save')}
            </button>
          }
        />
      }
    >
      <SaTenantSection title={t('platform.title')}>
        <SaTenantInfoRow k={t('platform.defaultLocale')} v="ru" mono />
        <SaTenantInfoRow k={t('platform.fallbackLocale')} v="en" mono />
        <SaTenantInfoRow k={t('platform.maxFileMb')} v="25" mono />
        <SaTenantInfoRow
          k={t('platform.signupOpen')}
          v={<span className="pill pill-success">{t('platform.on')}</span>}
        />
        <SaTenantInfoRow k={t('platform.trialDays')} v="14" />
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('email.title')} subtitle={t('email.subtitle')}>
        <SaTenantInfoRow k={t('email.from')} v="noreply@ishflow.com" />
        <SaTenantInfoRow k={t('email.replyTo')} v="support@ishflow.com" />
        <SaTenantInfoRow k={t('email.provider')} v="Resend (re_***0042)" mono />
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('stripe.title')} subtitle={t('stripe.subtitle')}>
        <SaTenantInfoRow
          k={t('stripe.mode')}
          v={<span className="pill pill-success">{t('stripe.live')}</span>}
        />
        <SaTenantInfoRow k={t('stripe.webhookSecret')} v="whsec_***ab12" mono />
        <SaTenantInfoRow k={t('stripe.publishableKey')} v="pk_live_***" mono />
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
