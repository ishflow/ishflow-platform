/**
 * Resolve the public marketing site URL used for absolute links
 * (sitemap, OG, email confirmation). Prefers MARKETING_SITE_URL,
 * falls back to NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost.
 */

export function getSiteUrl(): string {
  const explicit = process.env.MARKETING_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return stripTrailingSlash(explicit);
  if (process.env.VERCEL_URL) return `https://${stripTrailingSlash(process.env.VERCEL_URL)}`;
  return 'http://localhost:3100';
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
