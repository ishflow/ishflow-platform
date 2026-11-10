/**
 * Plan-changed email — sent (best-effort) when an operator changes a tenant's
 * plan, in the tenant's locale. Branded layout. ru/en/tr; others fall back en.
 */
import { escapeEmailHtml, renderBrandedEmail } from './branded-layout';
import { resend } from './resend-client';

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';
const SITE_URL = process.env.MARKETING_SITE_URL ?? 'https://ishflow.com';

type EmailLocale = 'ru' | 'en' | 'tr';
function pickLocale(locale: string): EmailLocale {
  return locale === 'ru' || locale === 'tr' ? locale : 'en';
}
function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

const COPY: Record<
  EmailLocale,
  {
    subject: (plan: string) => string;
    heading: (plan: string) => string;
    intro: (company: string, plan: string) => string;
    planLabel: string;
    statusLabel: string;
    statusValue: string;
    cta: string;
    help: string;
    tagline: string;
  }
> = {
  en: {
    subject: (p) => `Your ishflow plan is now ${p}`,
    heading: (p) => `You’re now on the ${p} plan 🎉`,
    intro: (c, p) =>
      `The ishflow plan for <b>${c}</b> has been updated to <b>${p}</b>. Enjoy the new features.`,
    planLabel: 'New plan',
    statusLabel: 'Status',
    statusValue: 'Active',
    cta: 'View billing →',
    help: 'Questions about your plan? Just reply to this email.',
    tagline:
      'ishflow &middot; Smart accounting &amp; operations for your business &middot; ishflow.com',
  },
  ru: {
    subject: (p) => `Ваш тариф ishflow теперь ${p}`,
    heading: (p) => `Вы перешли на тариф ${p} 🎉`,
    intro: (c, p) =>
      `Тариф ishflow для <b>${c}</b> обновлён до <b>${p}</b>. Пользуйтесь новыми возможностями.`,
    planLabel: 'Новый тариф',
    statusLabel: 'Статус',
    statusValue: 'Активен',
    cta: 'Открыть оплату →',
    help: 'Вопросы по тарифу? Просто ответьте на это письмо.',
    tagline: 'ishflow &middot; Умный учёт и операции для вашего бизнеса &middot; ishflow.com',
  },
  tr: {
    subject: (p) => `ishflow planınız artık ${p}`,
    heading: (p) => `Artık ${p} plandasınız 🎉`,
    intro: (c, p) =>
      `<b>${c}</b> için ishflow planınız <b>${p}</b> olarak güncellendi. Yeni özelliklerin keyfini çıkarın.`,
    planLabel: 'Yeni plan',
    statusLabel: 'Durum',
    statusValue: 'Aktif',
    cta: 'Faturalandırmayı gör →',
    help: 'Planınızla ilgili sorularınız mı var? Bu e-postayı yanıtlayın.',
    tagline:
      'ishflow &middot; İşletmeniz için akıllı muhasebe &amp; operasyon &middot; ishflow.com',
  },
};

export interface SendPlanChangedEmailInput {
  to: string;
  companyName: string;
  plan: string;
  locale: string;
}

export async function sendPlanChangedEmail(
  input: SendPlanChangedEmailInput,
): Promise<{ ok: boolean }> {
  const t = COPY[pickLocale(input.locale)];
  const company = escapeEmailHtml(input.companyName);
  const plan = escapeEmailHtml(planLabel(input.plan));
  const html = renderBrandedEmail({
    heading: t.heading(plan),
    paragraphs: [t.intro(company, plan)],
    infoCells: [
      { label: t.planLabel, value: plan },
      { label: t.statusLabel, value: t.statusValue },
    ],
    cta: { label: t.cta, href: `${SITE_URL}/settings/billing` },
    footerNote: t.help,
    footerTagline: t.tagline,
  });
  try {
    const res = await resend().emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: t.subject(plan),
      html,
    });
    if (res.error) {
      console.error('[email] plan-changed send error:', res.error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] plan-changed send threw:', err);
    return { ok: false };
  }
}
