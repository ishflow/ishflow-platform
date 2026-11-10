import { getTranslations } from 'next-intl/server';

export async function V2BillingToggle() {
  const t = await getTranslations('v2_marketing.pricing');
  return (
    <div className="billing-toggle">
      <span className="opt is-active">{t('monthly')}</span>
      <span className="opt">
        {t('annual')} <span className="save">{t('annualSave')}</span>
      </span>
    </div>
  );
}
