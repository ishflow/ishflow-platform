import { resend } from './resend-client';
import type { EmailLocale } from './send-invoice-sent';

export interface LowStockItem {
  name: string;
  onHand: number;
  threshold: number;
}

export interface SendLowStockAlertInput {
  to: string;
  workspaceName: string;
  items: LowStockItem[];
  dashboardUrl: string;
  locale?: EmailLocale;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';

export async function sendLowStockAlertEmail(
  input: SendLowStockAlertInput,
): Promise<{ id: string }> {
  const locale = input.locale ?? 'en';
  const subject = SUBJECTS[locale](input.workspaceName, input.items.length);
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

const SUBJECTS: Record<EmailLocale, (ws: string, n: number) => string> = {
  en: (ws, n) => `${n} product${n === 1 ? '' : 's'} below threshold in ${ws}`,
  ru: (ws, n) => `${n} товар${pluralRu(n)} ниже порога в ${ws}`,
  tr: (ws, n) => `${ws} içinde ${n} ürün eşiğin altında`,
};

function pluralRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ов';
}

const HTML_BODIES: Record<EmailLocale, (i: SendLowStockAlertInput) => string> = {
  en: (i) =>
    `<p>The following products in <strong>${escapeHtml(i.workspaceName)}</strong> are at or below their alert threshold:</p>
     ${tableHtml(i.items, 'Product', 'On hand', 'Threshold')}
     <p><a href="${i.dashboardUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Open dashboard</a></p>`,
  ru: (i) =>
    `<p>Следующие товары в <strong>${escapeHtml(i.workspaceName)}</strong> на пороге или ниже:</p>
     ${tableHtml(i.items, 'Товар', 'Остаток', 'Порог')}
     <p><a href="${i.dashboardUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Открыть панель</a></p>`,
  tr: (i) =>
    `<p>Aşağıdaki <strong>${escapeHtml(i.workspaceName)}</strong> ürünleri alarm eşiğinin altında:</p>
     ${tableHtml(i.items, 'Ürün', 'Stok', 'Eşik')}
     <p><a href="${i.dashboardUrl}" style="background:#0070f3;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Panele git</a></p>`,
};

function tableHtml(items: LowStockItem[], col1: string, col2: string, col3: string): string {
  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:6px 12px;border-top:1px solid #e5e7eb;">${escapeHtml(it.name)}</td><td style="padding:6px 12px;border-top:1px solid #e5e7eb;text-align:right;">${it.onHand}</td><td style="padding:6px 12px;border-top:1px solid #e5e7eb;text-align:right;">${it.threshold}</td></tr>`,
    )
    .join('');
  return `<table style="border-collapse:collapse;font-family:sans-serif;">
    <thead><tr><th style="padding:6px 12px;text-align:left;">${escapeHtml(col1)}</th><th style="padding:6px 12px;text-align:right;">${escapeHtml(col2)}</th><th style="padding:6px 12px;text-align:right;">${escapeHtml(col3)}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
