import { escapeHtml } from './escape-html';
import { resend } from './resend-client';

export type DowngradeBlockedKind =
  | 'members'
  | 'monthly_posted_docs'
  | 'storage_bytes'
  | 'saved_views';

export interface SendDowngradeBlockedInput {
  to: string;
  workspaceName: string;
  newPlan: string;
  kind: DowngradeBlockedKind;
  current: number;
  allowed: number;
  billingUrl: string;
  locale?: 'en' | 'ru' | 'tr';
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';

export async function sendDowngradeBlockedEmail(
  input: SendDowngradeBlockedInput,
): Promise<{ id: string }> {
  const locale = input.locale ?? 'en';
  // Subject is plain text; escape the tenant-controlled workspace name in the
  // HTML body to prevent HTML injection. Finding B2.
  const subject = SUBJECTS[locale](input.workspaceName, input.newPlan);
  const html = HTML_BODIES[locale]({ ...input, workspaceName: escapeHtml(input.workspaceName) });

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

const KIND_LABELS: Record<'en' | 'ru' | 'tr', Record<DowngradeBlockedKind, string>> = {
  en: {
    members: 'members',
    monthly_posted_docs: 'monthly posted documents',
    storage_bytes: 'storage',
    saved_views: 'saved views',
  },
  ru: {
    members: 'участников',
    monthly_posted_docs: 'проведённых документов в месяц',
    storage_bytes: 'хранилища',
    saved_views: 'сохранённых представлений',
  },
  tr: {
    members: 'üye sayısı',
    monthly_posted_docs: 'aylık kayıt edilen belge sayısı',
    storage_bytes: 'depolama',
    saved_views: 'kayıtlı görünüm',
  },
};

const SUBJECTS = {
  en: (ws: string, newPlan: string) => `${ws}: downgrade to ${newPlan} was blocked`,
  ru: (ws: string, newPlan: string) => `${ws}: переход на тариф ${newPlan} заблокирован`,
  tr: (ws: string, newPlan: string) => `${ws}: ${newPlan} planına geçiş engellendi`,
};

const HTML_BODIES = {
  en: (i: SendDowngradeBlockedInput) =>
    `<p>Your <strong>${i.workspaceName}</strong> downgrade to the <strong>${i.newPlan}</strong> plan was blocked.</p>
     <p>Current ${KIND_LABELS.en[i.kind]} (${i.current}) exceeds the ${i.newPlan} limit (${i.allowed}). Please reduce usage before downgrading.</p>
     <p><a href="${i.billingUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Manage billing</a></p>`,
  ru: (i: SendDowngradeBlockedInput) =>
    `<p>Переход на тариф <strong>${i.newPlan}</strong> для <strong>${i.workspaceName}</strong> заблокирован.</p>
     <p>Текущее количество ${KIND_LABELS.ru[i.kind]} (${i.current}) превышает лимит тарифа ${i.newPlan} (${i.allowed}). Уменьшите использование перед сменой тарифа.</p>
     <p><a href="${i.billingUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Управление подпиской</a></p>`,
  tr: (i: SendDowngradeBlockedInput) =>
    `<p><strong>${i.workspaceName}</strong> için <strong>${i.newPlan}</strong> planına geçiş engellendi.</p>
     <p>Geçerli ${KIND_LABELS.tr[i.kind]} (${i.current}) yeni planın limitini (${i.allowed}) aşıyor. Plan değiştirmeden önce kullanımı azaltın.</p>
     <p><a href="${i.billingUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Faturalandırma</a></p>`,
};
