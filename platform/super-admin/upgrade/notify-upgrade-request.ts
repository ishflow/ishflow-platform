import { resend } from '@/platform/email/resend-client';

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@ishflow.com';
const SITE_URL = process.env.MARKETING_SITE_URL ?? 'https://ishflow.com';

function notifyTo(): string {
  return process.env.SUPER_ADMIN_NOTIFY_EMAIL ?? 'owner@example.com';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface NotifyUpgradeRequestInput {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  requestedPlan: string | null;
  note: string | null;
}

/**
 * Best-effort operator notification for a new upgrade request. Mirrors
 * `notifyOpsOfLead` (platform/marketing/send-emails.ts): swallows errors after
 * logging so a flaky mail provider never breaks the request that triggered it.
 */
export async function notifyUpgradeRequest(
  input: NotifyUpgradeRequestInput,
): Promise<{ ok: boolean }> {
  const html = `
    <h2>New upgrade request — ${escapeHtml(input.companyName)}</h2>
    <table style="border-collapse:collapse;font-family:system-ui,sans-serif;">
      <tr><td><strong>Company</strong></td><td>${escapeHtml(input.companyName)}</td></tr>
      <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(input.contactEmail)}">${escapeHtml(input.contactEmail)}</a></td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(input.contactPhone)}</td></tr>
      <tr><td><strong>Requested plan</strong></td><td>${escapeHtml(input.requestedPlan ?? '—')}</td></tr>
    </table>
    ${input.note ? `<h3>Note</h3><pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;background:#f7f7f8;padding:12px;border-radius:8px;">${escapeHtml(input.note)}</pre>` : ''}
    <p><a href="${SITE_URL}/super-admin/upgrades">Open upgrade requests →</a></p>
  `;

  try {
    const result = await resend().emails.send({
      from: FROM_ADDRESS,
      to: notifyTo(),
      subject: `Upgrade request — ${input.companyName}`,
      html,
      replyTo: input.contactEmail,
    });
    if (result.error) {
      console.error('[upgrade] notify error:', result.error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[upgrade] notify threw:', err);
    return { ok: false };
  }
}
