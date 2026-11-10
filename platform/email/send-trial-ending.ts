import { escapeHtml } from './escape-html';
import { resend } from './resend-client';

export interface SendTrialEndingInput {
  to: string;
  workspaceName: string;
  daysLeft: number;
  upgradeUrl: string;
  locale?: 'en' | 'ru' | 'tr';
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';

export async function sendTrialEndingEmail(input: SendTrialEndingInput): Promise<{ id: string }> {
  const locale = input.locale ?? 'en';
  // Subject is plain text; the HTML body must escape the tenant-controlled
  // workspace name to prevent HTML injection. Finding B2.
  const subject = SUBJECTS[locale](input.workspaceName, input.daysLeft);
  const html = HTML_BODIES[locale](
    escapeHtml(input.workspaceName),
    input.daysLeft,
    input.upgradeUrl,
  );

  const result = await resend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  if (!result.data) {
    throw new Error('Resend returned no data');
  }
  return { id: result.data.id };
}

const SUBJECTS = {
  en: (ws: string, days: number) => `Your ${ws} trial ends in ${days} days`,
  ru: (ws: string, days: number) => `Пробный период ${ws} заканчивается через ${days} дней`,
  tr: (ws: string, days: number) => `${ws} deneme süreniz ${days} gün içinde bitiyor`,
};

const HTML_BODIES = {
  en: (ws: string, days: number, url: string) =>
    `<p>Your <strong>${ws}</strong> trial ends in <strong>${days} days</strong>.</p>
     <p>Continue without interruption by choosing a plan:</p>
     <p><a href="${url}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Choose a plan</a></p>
     <p>If you have questions, just reply to this email.</p>`,
  ru: (ws: string, days: number, url: string) =>
    `<p>Пробный период <strong>${ws}</strong> заканчивается через <strong>${days} дней</strong>.</p>
     <p>Продолжите работу без перерыва — выберите тариф:</p>
     <p><a href="${url}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Выбрать тариф</a></p>
     <p>Если есть вопросы — ответьте на это письмо.</p>`,
  tr: (ws: string, days: number, url: string) =>
    `<p><strong>${ws}</strong> deneme süreniz <strong>${days} gün</strong> içinde sona eriyor.</p>
     <p>Kesintisiz devam etmek için plan seçin:</p>
     <p><a href="${url}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Plan seç</a></p>
     <p>Sorularınız için bu e-postayı yanıtlamanız yeterli.</p>`,
};
