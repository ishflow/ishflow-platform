import { resend } from './resend-client';
import type { EmailLocale } from './send-invoice-sent';

export interface SendPaymentReceivedInput {
  to: string;
  workspaceName: string;
  customerName: string;
  amount: string;
  currency: string;
  receivedAt: string;
  locale?: EmailLocale;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';

export async function sendPaymentReceivedEmail(
  input: SendPaymentReceivedInput,
): Promise<{ id: string }> {
  const locale = input.locale ?? 'en';
  const subject = SUBJECTS[locale](input.workspaceName, input.amount, input.currency);
  const html = HTML_BODIES[locale](input);

  const result = await resend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject,
    html,
  });

  if (result.error) throw new Error(`Resend error: ${result.error.message}`);
  if (!result.data) throw new Error('Resend returned no data');
  return { id: result.data.id };
}

const SUBJECTS: Record<EmailLocale, (ws: string, amount: string, ccy: string) => string> = {
  en: (ws, amount, ccy) => `${ws} received your payment of ${amount} ${ccy}`,
  ru: (ws, amount, ccy) => `${ws} получил вашу оплату ${amount} ${ccy}`,
  tr: (ws, amount, ccy) => `${ws}, ${amount} ${ccy} ödemenizi aldı`,
};

const HTML_BODIES: Record<EmailLocale, (i: SendPaymentReceivedInput) => string> = {
  en: (i) =>
    `<p>Hi ${escapeHtml(i.customerName)},</p>
     <p><strong>${escapeHtml(i.workspaceName)}</strong> received your payment of <strong>${escapeHtml(i.amount)} ${escapeHtml(i.currency)}</strong> on ${escapeHtml(i.receivedAt)}.</p>
     <p>Thank you for your business.</p>`,
  ru: (i) =>
    `<p>Здравствуйте, ${escapeHtml(i.customerName)}.</p>
     <p><strong>${escapeHtml(i.workspaceName)}</strong> получил вашу оплату <strong>${escapeHtml(i.amount)} ${escapeHtml(i.currency)}</strong> ${escapeHtml(i.receivedAt)}.</p>
     <p>Спасибо за сотрудничество.</p>`,
  tr: (i) =>
    `<p>Merhaba ${escapeHtml(i.customerName)},</p>
     <p><strong>${escapeHtml(i.workspaceName)}</strong>, <strong>${escapeHtml(i.amount)} ${escapeHtml(i.currency)}</strong> tutarındaki ödemenizi ${escapeHtml(i.receivedAt)} tarihinde aldı.</p>
     <p>İş birliğiniz için teşekkür ederiz.</p>`,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
