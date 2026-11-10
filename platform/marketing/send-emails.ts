/**
 * Marketing email helpers — newsletter double opt-in confirmation and
 * internal lead notifications. Uses the shared Resend client.
 *
 * Both helpers swallow errors after logging so a flaky email provider
 * never breaks a server action — the lead row is still persisted.
 */

import { resend } from '@/platform/email/resend-client';

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';
const OPS_ADDRESS = process.env.MARKETING_OPS_EMAIL ?? 'ops@ishflow.com';
const SITE_URL = process.env.MARKETING_SITE_URL ?? 'https://ishflow.com';

type EmailLocale = 'en' | 'ru' | 'tr';

function pickLocale(locale: string): EmailLocale {
  if (locale === 'ru' || locale === 'tr') return locale;
  return 'en';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface SendNewsletterConfirmInput {
  to: string;
  confirmUrl: string;
  locale?: string;
}

const NEWSLETTER_SUBJECT: Record<EmailLocale, string> = {
  en: 'Confirm your subscription to the ishflow newsletter',
  ru: 'Подтвердите подписку на рассылку ishflow',
  tr: 'ishflow bültenine aboneliğinizi onaylayın',
};

const NEWSLETTER_BODY: Record<EmailLocale, (url: string) => string> = {
  en: (url) =>
    `<p>Thanks for signing up.</p>
     <p>Please click the button below to confirm your email and start receiving product updates from ishflow.</p>
     <p><a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Confirm subscription</a></p>
     <p style="color:#666;font-size:12px;">If you did not sign up, you can safely ignore this email.</p>`,
  ru: (url) =>
    `<p>Спасибо за подписку.</p>
     <p>Подтвердите email, чтобы получать обновления продукта ishflow.</p>
     <p><a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Подтвердить подписку</a></p>
     <p style="color:#666;font-size:12px;">Если вы не подписывались — просто проигнорируйте это письмо.</p>`,
  tr: (url) =>
    `<p>Kayıt için teşekkürler.</p>
     <p>ishflow ürün güncellemelerini almaya başlamak için e-postanızı onaylayın.</p>
     <p><a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Aboneliği onayla</a></p>
     <p style="color:#666;font-size:12px;">Eğer abone olmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
};

export async function sendNewsletterConfirmEmail(
  input: SendNewsletterConfirmInput,
): Promise<{ ok: boolean }> {
  const locale = pickLocale(input.locale ?? 'en');
  try {
    const result = await resend().emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: NEWSLETTER_SUBJECT[locale],
      html: NEWSLETTER_BODY[locale](input.confirmUrl),
    });
    if (result.error) {
      console.error('[marketing] newsletter confirm send error:', result.error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[marketing] newsletter confirm send threw:', err);
    return { ok: false };
  }
}

export interface NotifyOpsOfLeadInput {
  name: string;
  email: string;
  company?: string;
  size?: string;
  message: string;
  source: string;
}

export async function notifyOpsOfLead(input: NotifyOpsOfLeadInput): Promise<{ ok: boolean }> {
  const html = `
    <h2>New marketing lead (${escapeHtml(input.source)})</h2>
    <table style="border-collapse:collapse;font-family:system-ui,sans-serif;">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(input.name)}</td></tr>
      <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
      <tr><td><strong>Company</strong></td><td>${escapeHtml(input.company ?? '—')}</td></tr>
      <tr><td><strong>Size</strong></td><td>${escapeHtml(input.size ?? '—')}</td></tr>
    </table>
    <h3>Message</h3>
    <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;background:#f7f7f8;padding:12px;border-radius:8px;">${escapeHtml(input.message)}</pre>
    <p><a href="${SITE_URL}/super-admin">Open Super Admin →</a></p>
  `;

  try {
    const result = await resend().emails.send({
      from: FROM_ADDRESS,
      to: OPS_ADDRESS,
      subject: `New lead — ${input.name} (${input.email})`,
      html,
      replyTo: input.email,
    });
    if (result.error) {
      console.error('[marketing] notify ops error:', result.error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[marketing] notify ops threw:', err);
    return { ok: false };
  }
}
