export type RailKey =
  | 'dashboard'
  | 'catalogs'
  | 'documents'
  | 'registers'
  | 'reports'
  | 'addons'
  | 'admin'
  | 'settings';

const PREFIX_TO_RAIL: Array<[string, RailKey]> = [
  ['dashboard', 'dashboard'],
  ['catalogs', 'catalogs'],
  ['documents', 'documents'],
  ['purchases', 'documents'],
  ['registers', 'registers'],
  ['reports', 'reports'],
  ['addons', 'addons'],
  ['admin', 'admin'],
  ['settings', 'settings'],
  ['support', 'settings'],
];

const LOCALES = new Set(['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh']);

export function activeRailFromPath(pathname: string): RailKey {
  const parts = pathname.split('/').filter(Boolean);
  let i = 0;
  const first = parts[i];
  if (first && LOCALES.has(first)) i++;
  if (parts[i] === 'v2') i++;
  const seg = parts[i];
  if (!seg) return 'dashboard';
  for (const [prefix, rail] of PREFIX_TO_RAIL) {
    if (seg === prefix) return rail;
  }
  return 'dashboard';
}
