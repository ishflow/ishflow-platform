/**
 * HTML-escape a string for safe interpolation into email HTML bodies.
 * Tenant-controlled values (e.g. workspace name) MUST pass through this before
 * being embedded in a template literal. Finding B2.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
