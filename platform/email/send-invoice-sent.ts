import { resend } from './resend-client';

export type EmailLocale = 'en' | 'ru' | 'tr';

export interface SendInvoiceSentInput {
  to: string;
  workspaceName: string;
  customerName: string;
  invoiceNumber: string;
  totalAmount: string;
  currency: string;
  invoiceUrl: string;
  locale?: EmailLocale;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';

export async function sendInvoiceSentEmail(input: SendInvoiceSentInput): Promise<{ id: string }> {
  const locale = input.locale ?? 'en';
  const subject = SUBJECTS[locale](input.workspaceName, input.invoiceNumber);
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

const SUBJECTS: Record<EmailLocale, (ws: string, no: string) => string> = {
  en: (ws, no) => `Invoice ${no} from ${ws}`,
  ru: (ws, no) => `Счёт ${no} от ${ws}`,
  tr: (ws, no) => `${ws} faturası ${no}`,
};

const HTML_BODIES: Record<EmailLocale, (i: SendInvoiceSentInput) => string> = {
  en: (i) =>
    `<p>Hi ${escapeHtml(i.customerName)},</p>
     <p><strong>${escapeHtml(i.workspaceName)}</strong> sent you invoice <strong>${escapeHtml(i.invoiceNumber)}</strong> for <strong>${escapeHtml(i.totalAmount)} ${escapeHtml(i.currency)}</strong>.</p>
     <p><a href="${i.invoiceUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">View invoice</a></p>
     <p>Reply to this email if you have any questions.</p>`,
  ru: (i) =>
    `<p>Здравствуйте, ${escapeHtml(i.customerName)}.</p>
     <p><strong>${escapeHtml(i.workspaceName)}</strong> отправил счёт <strong>${escapeHtml(i.invoiceNumber)}</strong> на сумму <strong>${escapeHtml(i.totalAmount)} ${escapeHtml(i.currency)}</strong>.</p>
     <p><a href="${i.invoiceUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Открыть счёт</a></p>
     <p>Если есть вопросы — ответьте на это письмо.</p>`,
  tr: (i) =>
    `<p>Merhaba ${escapeHtml(i.customerName)},</p>
     <p><strong>${escapeHtml(i.workspaceName)}</strong>, <strong>${escapeHtml(i.invoiceNumber)}</strong> numaralı <strong>${escapeHtml(i.totalAmount)} ${escapeHtml(i.currency)}</strong> tutarındaki faturayı gönderdi.</p>
     <p><a href="${i.invoiceUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Faturayı görüntüle</a></p>
     <p>Sorularınız varsa bu e-postayı yanıtlamanız yeterli.</p>`,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
