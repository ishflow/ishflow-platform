import type { AppContext, RoleScopeGroup, ScopeRule } from '@/platform/auth/current-context';
import type { CatalogConfig, DocumentConfig } from '@/platform/metadata';

type AnyConfig = CatalogConfig | DocumentConfig;
type Op = 'read' | 'create' | 'update' | 'delete' | 'post' | 'unpost';
type Where = Record<string, unknown>;

/**
 * Compute a Prisma `where` clause that narrows to rows matching the user's
 * row-level scope for the given entity. Semantics:
 *
 * - No scoping roles granted on this entity → undefined (caller applies no filter).
 * - Any role with empty rules → unrestricted access (undefined).
 * - Otherwise: OR across per-role groups; each group is an AND of rule clauses.
 * - Unknown context binding inside a role → that role contributes nothing.
 * - If no role resolves to a usable clause, returns `{ id: '__never__' }` (deny).
 */
export function scopeWhere(ctx: AppContext, config: AnyConfig, _op: Op): Where | undefined {
  const groups = groupsFor(ctx, config);
  if (!groups || groups.length === 0) return undefined;
  if (groups.some((g) => g.rules.length === 0)) return undefined;

  const perRole: Where[] = [];
  for (const g of groups) {
    const clauses = g.rules.map((r) => toClause(r, ctx)).filter((c): c is Where => c !== null);
    if (clauses.length !== g.rules.length) {
      // At least one rule failed to resolve — this role grants nothing.
      continue;
    }
    const and = andClauses(clauses);
    if (and) perRole.push(and);
  }

  if (perRole.length === 0) return { id: '__never__' };
  if (perRole.length === 1) return perRole[0];
  return { OR: perRole };
}

/**
 * Predicate check used when we already have the record in hand (create, update,
 * delete, post, unpost guards). Same semantics as scopeWhere, but against a
 * fully materialised record.
 */
export function scopeMatches(
  ctx: AppContext,
  config: AnyConfig,
  record: Record<string, unknown>,
): boolean {
  const groups = groupsFor(ctx, config);
  if (!groups || groups.length === 0) return true;
  if (groups.some((g) => g.rules.length === 0)) return true;
  return groups.some((g) => g.rules.every((r) => recordSatisfies(r, record, ctx)));
}

function groupsFor(ctx: AppContext, config: AnyConfig): RoleScopeGroup[] | undefined {
  const specific = ctx.scopesByEntity.get(config.id) ?? [];
  const wildcard = ctx.scopesByEntity.get('*') ?? [];
  const merged = [...specific, ...wildcard];
  return merged.length ? merged : undefined;
}

function toClause(rule: ScopeRule, ctx: AppContext): Where | null {
  const resolved = resolveValue(rule, ctx);
  if (resolved === undefined) return null;
  switch (rule.operator) {
    case 'equals':
      return { [rule.field]: resolved };
    case 'in_':
      return { [rule.field]: { in: resolved as unknown[] } };
    case 'contextEquals':
      return { [rule.field]: resolved };
    case 'currentUser':
      return { [rule.field]: resolved };
  }
}

function resolveValue(rule: ScopeRule, ctx: AppContext): unknown {
  if (rule.operator === 'currentUser') {
    return ctx.user.id || undefined;
  }
  if (rule.operator !== 'contextEquals') return rule.value;
  if (rule.value === '$context.userId') return ctx.user.id;
  if (rule.value === '$context.tenantId') return ctx.tenant?.id;
  return undefined;
}

function recordSatisfies(
  rule: ScopeRule,
  record: Record<string, unknown>,
  ctx: AppContext,
): boolean {
  const resolved = resolveValue(rule, ctx);
  if (resolved === undefined) return false;
  const actual = record[rule.field];
  switch (rule.operator) {
    case 'equals':
    case 'contextEquals':
    case 'currentUser':
      return actual === resolved;
    case 'in_':
      return Array.isArray(resolved) && (resolved as unknown[]).includes(actual);
  }
}

function andClauses(clauses: Where[]): Where | undefined {
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}
