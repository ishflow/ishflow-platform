import { getRegistry } from '@/platform/metadata';

const HEADER = `// GENERATED FILE — do not edit by hand. Run \`pnpm generate\`.

export type NavEntry = {
  kind: 'catalog' | 'document' | 'register';
  id: string;
  module: string;
  name: string;
  href: string;
  label: Record<string, string>;
  icon?: string;
  sidebarHidden?: boolean;
};
`;

export function emitNav(): string {
  const registry = getRegistry();
  const entries: string[] = [];

  for (const c of Object.values(registry.catalog).sort(byId)) {
    const label = c.pluralLabel ?? c.label;
    entries.push(`  {
    kind: "catalog",
    id: "${c.id}",
    module: "${c.module}",
    name: "${c.name}",
    href: "/catalogs/${c.id}",
    label: ${JSON.stringify(label, null, 2)},${iconLine(c.icon)}${sidebarHiddenLine(c.sidebarHidden)}
  }`);
  }

  for (const d of Object.values(registry.document).sort(byId)) {
    const label = d.pluralLabel ?? d.label;
    entries.push(`  {
    kind: "document",
    id: "${d.id}",
    module: "${d.module}",
    name: "${d.name}",
    href: "/documents/${d.id}",
    label: ${JSON.stringify(label, null, 2)},${iconLine(d.icon)}
  }`);
  }

  for (const r of Object.values(registry.register).sort(byId)) {
    entries.push(`  {
    kind: "register",
    id: "${r.id}",
    module: "${r.module}",
    name: "${r.name}",
    href: "/registers/${r.id}",
    label: ${JSON.stringify(r.label, null, 2)},${iconLine(r.icon)}
  }`);
  }

  return `${HEADER}
export const navManifest: readonly NavEntry[] = [
${entries.join(',\n')}
];
`;
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id);
}

function iconLine(icon: string | undefined): string {
  return icon ? `\n    icon: ${JSON.stringify(icon)},` : '';
}

function sidebarHiddenLine(hidden: boolean | undefined): string {
  return hidden ? '\n    sidebarHidden: true,' : '';
}
