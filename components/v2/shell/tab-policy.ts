/**
 * Whitelist: only "Yeni X" creation pages get pinned as tabs.
 * Rail item and panel sub-item clicks navigate normally (no tab append).
 * Matches when the LAST segment is `new`, `invite`, or `quick`
 * (optional trailing slash).
 */
export function shouldPinTab(pathname: string): boolean {
  return /\/(new|invite|quick)\/?$/.test(pathname);
}
