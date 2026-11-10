/**
 * Welcome email — sent (best-effort) when a tenant is newly created, in the
 * tenant's chosen locale. Uses the branded layout. ru/en/tr fully; other
 * locales fall back to en (project i18n policy).
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
    subject: string;
    heading: (c: string) => string;
    intro: (email: string) => string;
    planLabel: string;
    accountLabel: string;
    cta: string;
    help: string;
    tagline: string;
  }
> = {
  en: {
    subject: 'Welcome to ishflow',
    heading: (c) => `Welcome, ${c} 👋`,
    intro: (email) =>
      `Thanks for joining ishflow. Your account (<b>${email}</b>) is set up and ready to go.`,
    planLabel: 'Plan',
    accountLabel: 'Account',
    cta: 'Go to dashboard →',
    help: 'Need help? Just reply to this email and our team will get back to you.',
    tagline:
      'ishflow &middot; Smart accounting &amp; operations for your business &middot; ishflow.com',
  },
  ru: {
    subject: 'Добро пожаловать в ishflow',
    heading: (c) => `Добро пожаловать, ${c} 👋`,
    intro: (email) =>
      `Спасибо, что выбрали ishflow. Ваш аккаунт (<b>${email}</b>) создан и готов к работе.`,
    planLabel: 'Тариф',
    accountLabel: 'Аккаунт',
    cta: 'Перейти в панель →',
    help: 'Нужна помощь? Просто ответьте на это письмо — наша команда поможет.',
    tagline: 'ishflow &middot; Умный учёт и операции для вашего бизнеса &middot; ishflow.com',
  },
  tr: {
    subject: 'ishflow’a hoş geldiniz',
    heading: (c) => `Hoş geldiniz, ${c} 👋`,
    intro: (email) =>
      `ishflow ailesine katıldığınız için teşekkürler. Hesabınız (<b>${email}</b>) oluşturuldu ve kullanıma hazır.`,
    planLabel: 'Plan',
    accountLabel: 'Hesap',
    cta: 'Panele git →',
    help: 'Yardıma mı ihtiyacınız var? Bu e-postayı yanıtlayın, ekibimiz size dönsün.',
    tagline:
      'ishflow &middot; İşletmeniz için akıllı muhasebe &amp; operasyon &middot; ishflow.com',
  },
};

export interface SendWelcomeEmailInput {
  to: string;
  companyName: string;
  plan: string;
  locale: string;
}

export async function sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<{ ok: boolean }> {
  const t = COPY[pickLocale(input.locale)];
  const company = escapeEmailHtml(input.companyName);
  const email = escapeEmailHtml(input.to);
  const html = renderBrandedEmail({
    heading: t.heading(company),
    paragraphs: [t.intro(email)],
    infoCells: [
      { label: t.planLabel, value: escapeEmailHtml(planLabel(input.plan)) },
      { label: t.accountLabel, value: email },
    ],
    cta: { label: t.cta, href: `${SITE_URL}/dashboard` },
    footerNote: t.help,
    footerTagline: t.tagline,
  });
  try {
    const res = await resend().emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: t.subject,
      html,
    });
    if (res.error) {
      console.error('[email] welcome send error:', res.error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] welcome send threw:', err);
    return { ok: false };
  }
}
