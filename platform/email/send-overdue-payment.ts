import { resend } from './resend-client';
import type { EmailLocale } from './send-invoice-sent';

export interface SendOverduePaymentInput {
  to: string;
  workspaceName: string;
  customerName: string;
  invoiceNumber: string;
  daysOverdue: number;
  amount: string;
  currency: string;
  invoiceUrl: string;
  locale?: EmailLocale;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';

export async function sendOverduePaymentEmail(
  input: SendOverduePaymentInput,
): Promise<{ id: string }> {
  const locale = input.locale ?? 'en';
  const subject = SUBJECTS[locale](input.invoiceNumber, input.daysOverdue);
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

const SUBJECTS: Record<EmailLocale, (no: string, days: number) => string> = {
  en: (no, days) => `Reminder: invoice ${no} is ${days} days overdue`,
  ru: (no, days) => `Напоминание: счёт ${no} просрочен на ${days} дн.`,
  tr: (no, days) => `Hatırlatma: ${no} numaralı fatura ${days} gün gecikti`,
};

const HTML_BODIES: Record<EmailLocale, (i: SendOverduePaymentInput) => string> = {
  en: (i) =>
    `<p>Hi ${escapeHtml(i.customerName)},</p>
     <p>This is a friendly reminder that invoice <strong>${escapeHtml(i.invoiceNumber)}</strong> for <strong>${escapeHtml(i.amount)} ${escapeHtml(i.currency)}</strong> from <strong>${escapeHtml(i.workspaceName)}</strong> is <strong>${i.daysOverdue} days overdue</strong>.</p>
     <p><a href="${i.invoiceUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">View invoice</a></p>
     <p>Reply to this email if you have any questions.</p>`,
  ru: (i) =>
    `<p>Здравствуйте, ${escapeHtml(i.customerName)}.</p>
     <p>Напоминаем, что счёт <strong>${escapeHtml(i.invoiceNumber)}</strong> на сумму <strong>${escapeHtml(i.amount)} ${escapeHtml(i.currency)}</strong> от <strong>${escapeHtml(i.workspaceName)}</strong> просрочен на <strong>${i.daysOverdue} дн.</strong></p>
     <p><a href="${i.invoiceUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Открыть счёт</a></p>
     <p>Если есть вопросы — ответьте на это письмо.</p>`,
  tr: (i) =>
    `<p>Merhaba ${escapeHtml(i.customerName)},</p>
     <p>Hatırlatma: <strong>${escapeHtml(i.workspaceName)}</strong> tarafından düzenlenen <strong>${escapeHtml(i.invoiceNumber)}</strong> numaralı <strong>${escapeHtml(i.amount)} ${escapeHtml(i.currency)}</strong> tutarındaki fatura <strong>${i.daysOverdue} gün</strong> gecikti.</p>
     <p><a href="${i.invoiceUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Faturayı görüntüle</a></p>
     <p>Sorularınız için bu e-postayı yanıtlamanız yeterli.</p>`,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
