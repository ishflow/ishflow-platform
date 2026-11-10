/**
 * Branded transactional email layout — matches the V2 web design
 * (brand blue #0F5EEF, "if" logo, white card). Email-safe: table layout +
 * inline styles only. All dynamic values are HTML-escaped by the caller via
 * `escapeEmailHtml`. Renders identically in light/dark clients (explicit
 * colors, no CSS-var/dark-mode dependency).
 */

const BLUE = '#0F5EEF';
const LOGO_URL = 'https://ishflow.com/v2-logo.png';

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface BrandedEmailInfoCell {
  label: string;
  value: string;
}

export interface BrandedEmailOptions {
  /** Pre-escaped, plain heading text (emoji allowed). */
  heading: string;
  /** Pre-escaped paragraphs; each rendered as its own <p>. */
  paragraphs: string[];
  /** Optional 1-2 cell info box (e.g. Plan / Account). Values pre-escaped. */
  infoCells?: BrandedEmailInfoCell[];
  /** Optional primary call-to-action button. */
  cta?: { label: string; href: string };
  /** Small muted note above the footer (pre-escaped). */
  footerNote?: string;
  /** Footer tagline line (pre-escaped, localized). */
  footerTagline: string;
}

export function renderBrandedEmail(o: BrandedEmailOptions): string {
  const paragraphs = o.paragraphs
    .map(
      (p) =>
        `<tr><td style="padding:6px 36px 0;"><p style="margin:0;font-size:15px;line-height:1.6;color:#42506b;">${p}</p></td></tr>`,
    )
    .join('');

  const infoBox =
    o.infoCells && o.infoCells.length > 0
      ? `<tr><td style="padding:18px 36px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f4f8ff;border:1px solid #d8e6ff;border-radius:10px;width:100%;"><tr>${o.infoCells
            .map(
              (c, i) =>
                `<td style="padding:14px 16px;font-size:13px;color:#42506b;${i > 0 ? 'border-left:1px solid #e6ebf3;' : ''}"><span style="color:#7c8aa6;">${c.label}</span><br><b style="color:#0a1330;font-size:15px;">${c.value}</b></td>`,
            )
            .join('')}</tr></table>
        </td></tr>`
      : '';

  const cta = o.cta
    ? `<tr><td style="padding:24px 36px 4px;">
        <a href="${o.cta.href}" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:9px;">${o.cta.label}</a>
      </td></tr>`
    : '';

  const footerNote = o.footerNote
    ? `<tr><td style="padding:18px 36px 30px;"><p style="margin:0;font-size:13px;line-height:1.6;color:#7c8aa6;">${o.footerNote}</p></td></tr>`
    : '<tr><td style="padding:10px 36px 24px;"></td></tr>';

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6fb;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6ebf3;">
  <tr><td style="padding:28px 36px 0;"><img src="${LOGO_URL}" alt="ishflow" height="34" style="height:34px;display:block;"></td></tr>
  <tr><td style="padding:8px 36px 0;"><div style="height:3px;width:46px;background:${BLUE};border-radius:3px;margin-top:14px;"></div></td></tr>
  <tr><td style="padding:22px 36px 6px;"><h1 style="margin:0;font-size:22px;line-height:1.3;color:#0a1330;font-weight:800;">${o.heading}</h1></td></tr>
  ${paragraphs}
  ${infoBox}
  ${cta}
  ${footerNote}
  <tr><td style="padding:18px 36px;background:#fafbfe;border-top:1px solid #eef2f8;"><p style="margin:0;font-size:12px;color:#9aa6bd;">${o.footerTagline}</p></td></tr>
</table>
</td></tr></table></body></html>`;
}
