import type { ReactNode } from 'react';

export type Locale = 'ru' | 'en' | 'tr' | 'uz' | 'ky' | 'de' | 'fr' | 'zh';

export type LocalizedLabel = Partial<Record<Locale, string>> & { en: string };

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'money'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'reference'
  | 'docNumber'
  | 'docRef'
  | 'documentLink'
  | 'color'
  | 'custom';

export type ReferenceToken = { kind: 'ref'; module: string; name: string };

export type BaseFieldConfig = {
  label: LocalizedLabel;
  required?: boolean;
  unique?: boolean;
  hidden?: boolean;
  /** Hide from create/edit forms but keep the field in list/detail views and the DB schema. */
  formHidden?: boolean;
  /** Hide from catalog/document list table columns but keep the field everywhere else. */
  listHidden?: boolean;
  /** If set, the engine assigns a value on create when the input record has none. Currently implemented as a random 8-char UUID prefix, not a monotonic counter — see catalog_sequence follow-up. */
  autoGenerate?: 'sequence';
  /**
   * Conditional form-visibility predicate. When set, the form renders this
   * field only when the live value of `field` equals `equals` (strict
   * equality on the form's current state — not the persisted record).
   *
   * MUST stay plain data (string + literal) so the config crosses the RSC
   * boundary. Engine validation still applies regardless of visibility, so
   * pair `showIf` with non-required fields when hiding implies "don't
   * collect this value." Designed for enum-discriminated fields like
   * `sales.price_type.kind` (static vs dynamic).
   */
  showIf?: { field: string; equals: string | number | boolean };
  /**
   * Visual grouping hint for settings forms. Fields sharing the same `group`
   * value render under one `<fieldset>` whose legend is looked up via
   * `v2_settings.groups.<group>` in the i18n catalog. Order of groups
   * follows order of first occurrence in `cfg.fields`.
   *
   * Only consumed by `renderV2Settings` / `V2SettingsForm`. Catalog and
   * document forms ignore this hint.
   */
  group?: string;
};

export type StringFieldConfig = BaseFieldConfig & {
  type: 'string';
  maxLength?: number;
  /**
   * When true the value must be a valid email address. Empty is still allowed
   * for optional fields (only `required` rejects empty), so this layers on top
   * of `required` rather than replacing it.
   */
  email?: boolean;
  /** Default value applied when the persisted row has no value for this field. */
  default?: string;
  placeholder?: string;
  /**
   * Closed enum: when present the field accepts only these values. Forms
   * render a `<select>` (V2 auto-field) instead of a free-form text input;
   * the engine's zod schema additionally enforces the membership.
   */
  enumValues?: readonly string[];
  /**
   * Optional per-value localized labels for enum rendering. Keys are the
   * raw `enumValues` entries; missing entries fall back to the raw value.
   */
  enumLabels?: Record<string, LocalizedLabel>;
};
export type TextFieldConfig = BaseFieldConfig & {
  type: 'text';
  /** Default value applied when the persisted row has no value for this field. */
  default?: string;
  placeholder?: string;
  rows?: number;
};
export type NumberFieldConfig = BaseFieldConfig & {
  type: 'number';
  min?: number;
  max?: number;
  formula?: string;
  /** Default value applied when the persisted row has no value for this field. */
  default?: number;
  placeholder?: string;
  /** Optional UI suffix (e.g. '%', 'min', 'GB'). Purely cosmetic. */
  suffix?: string;
  /**
   * Named transform bridging UI representation and DB storage. MUST be a
   * string identifier — raw function references would break the RSC
   * serialization boundary.
   *
   * - `'percentFraction'` — UI shows percent (e.g. `10`), DB stores fraction
   *   (`0.10`). Used on markup fields backed by `NUMERIC(p, s)`.
   */
  transform?: 'percentFraction';
};
/**
 * Hex color field rendered as a hex text input + 24×24 swatch preview that
 * live-updates as the user types. Persists as a 7-char `#rrggbb` string in
 * `tenant_settings`. First-class type (not a string-with-renderer) because
 * settings forms re-use it across branding, theming, accent overrides.
 */
export type ColorFieldConfig = BaseFieldConfig & {
  type: 'color';
  /** Default `#rrggbb` value applied when the persisted row has no value. */
  default?: string;
};
export type MoneyFieldConfig = BaseFieldConfig & {
  type: 'money';
  formula?: string;
  /** Numeric default applied on create when input lacks the field. */
  default?: number;
};
export type BooleanFieldConfig = BaseFieldConfig & { type: 'boolean'; default?: boolean };
export type DateFieldConfig = BaseFieldConfig & { type: 'date' };
export type DateTimeFieldConfig = BaseFieldConfig & { type: 'datetime'; default?: 'now' };
/**
 * Serializable filter descriptor for reference pickers. MUST stay plain data
 * (no function refs) so the config survives the RSC server→client boundary.
 *
 * - `'hasStockGt0'` — emits `{ 'filter.hasStockGt0': '1' }` regardless of row.
 * - `'staticOnly'` — emits `{ 'filter.staticOnly': '1' }`; for `sales.price_type`,
 *   restricts results to `kind='static'` records.
 * - `{ kind: 'rowFieldStock'; fromField: 'product' }` — emits
 *   `{ 'filter.hasProductStockGt0': <row.fromField> }` when the field is set,
 *   otherwise an empty filter.
 */
export type ReferenceFilterSpec =
  | 'hasStockGt0'
  | 'staticOnly'
  | { kind: 'rowFieldStock'; fromField: string };

export type ReferenceFieldConfig = BaseFieldConfig & {
  type: 'reference';
  to: ReferenceToken;
  onDelete?: 'cascade' | 'restrict' | 'setNull';
  /**
   * Named row-aware filter spec — resolved at render time by the reference
   * picker. Filter keys are forwarded verbatim to /api/reference/search.
   * Unknown spec values render no filter. Must NOT be a function: the config
   * crosses the RSC boundary as plain data.
   */
  referenceFilter?: ReferenceFilterSpec;
  /**
   * When `true`, the reference picker surfaces a "+ new" affordance that
   * creates the referenced record inline with just its `displayField` set.
   * Used for taxonomies like product category/group where the form filler
   * shouldn't have to leave the page to define a missing option.
   */
  inlineCreate?: boolean;
  /**
   * When set, the reference picker is scoped to the document's current party
   * (customer/supplier) via the wizard's party context — only that party's
   * documents are offered (e.g. a return's original-invoice picker, QA #75).
   * The value names the party header field for documentation; the wizard
   * resolves the active party id reactively.
   */
  filterByHeaderField?: string;
};
export type DocNumberFieldConfig = BaseFieldConfig & {
  type: 'docNumber';
  prefix: string;
  autoIncrement?: true;
};
export type DocRefFieldConfig = BaseFieldConfig & { type: 'docRef' };

/**
 * Escape hatch for UI that doesn't fit the standard field types — permission
 * matrices, audit diffs, custom panels. The shell resolves `renderer` against
 * a registry mapped to React components. MUST stay plain data (string ids,
 * no function refs) so the config crosses the RSC boundary.
 */
export type CustomFieldConfig = BaseFieldConfig & {
  type: 'custom';
  /** Registry key (e.g. 'permissionMatrix', 'auditDiff', 'clerkInviteList'). */
  renderer: string;
  /**
   * Optional path into the record providing the renderer's input data
   * (e.g. 'permissions' for role.permissions). Renderer is free to ignore it.
   */
  source?: string;
};

/**
 * Inline link to another document (e.g. a payment row settling a sales
 * invoice). Persists as TEXT (JSON array `[{invoiceId, amount}]`); the
 * engine helper `parseLinkedInvoices` parses it at posting time.
 *
 * The form renderer wires:
 *   - A toggle (default off) → submits `[]` when off.
 *   - A reference picker filtered by `filterByHeaderField` — only that
 *     party's documents show up.
 *   - A read-only amount display sourced from the linked document's open
 *     balance (or other future strategies).
 */
export type DocumentLinkFieldConfig = BaseFieldConfig & {
  type: 'documentLink';
  /** Target document type — same shape as `ReferenceFieldConfig.to`. */
  to: ReferenceToken;
  /** Name of a header field on the same document that holds the party id
   *  used to filter the picker (typically 'customer' or 'supplier'). */
  filterByHeaderField: string;
  /** How to derive the read-only amount shown next to the picker.
   *  - 'openBalance' (default): query the open A/R or A/P balance.
   *  - 'total': use the linked document's total amount. */
  amountSource?: 'openBalance' | 'total';
};

export type FieldConfig =
  | StringFieldConfig
  | TextFieldConfig
  | NumberFieldConfig
  | MoneyFieldConfig
  | BooleanFieldConfig
  | DateFieldConfig
  | DateTimeFieldConfig
  | ReferenceFieldConfig
  | DocNumberFieldConfig
  | DocRefFieldConfig
  | DocumentLinkFieldConfig
  | ColorFieldConfig
  | CustomFieldConfig;

// Sprint 16: permissions are either granted to everyone in the tenant
// ('any'), outright forbidden ('none'), or omitted — in which case check()
// derives the required wildcard code (entity:action) and looks it up in the
// user's Role.permissions set.
export type PermissionRule = 'any' | 'none';

export type Permissions = {
  read?: PermissionRule;
  write?: PermissionRule;
  delete?: PermissionRule;
};

export type DocumentPermissions = Permissions & {
  post?: PermissionRule;
  unpost?: PermissionRule;
};

export type PresentationFn = (record: Record<string, unknown>) => string;

export type CatalogListLayout = 'table' | 'invoice-card';

export type CatalogListColumn = {
  key: string;
  label: LocalizedLabel;
  align?: 'left' | 'right';
};

export type CatalogListChip = {
  key: string;
  label: LocalizedLabel;
};

/**
 * Per-row mutation surfaced on the list table. Used for super-admin catalogs
 * where each row carries a small set of context-dependent actions (e.g.
 * revoke an api_key, close a support_ticket). The list shell renders an
 * extra "Actions" column when `rowActions` is set on `CatalogListConfig`.
 *
 * All user-facing strings are declared inline as `LocalizedLabel` (same as
 * chips + columns) — no i18n namespace lookup. The shell resolves the
 * caller's active locale once and feeds the row-actions cell with
 * pre-resolved English strings.
 */
export type SaCatalogRowAction = {
  /** Stable key for audit + React key. */
  key: string;
  /** Button label. */
  label: LocalizedLabel;
  /** Lucide icon name. */
  icon: string;
  /** Server action — must be 'use server'. */
  action: (formData: FormData) => Promise<void>;
  /** Hidden form fields keyed by row data: e.g. `{apiKeyId: r => r.id}`. */
  hiddenFieldsFromRow: Record<string, (row: Record<string, unknown>) => string>;
  /** Hide the action for rows where the predicate returns false. */
  visibleWhen?: (row: Record<string, unknown>) => boolean;
  /** Button variant (default 'secondary'). */
  variant?: 'secondary' | 'destructive';
  /** Dialog config — inline labels (LocalizedLabel) for portability. */
  dialog: {
    type: 'confirm' | 'slugConfirm' | 'textInput' | 'select';
    title: LocalizedLabel;
    description: LocalizedLabel;
    confirm: LocalizedLabel;
    pending?: LocalizedLabel;
    cancel?: LocalizedLabel;
    destructive?: boolean;
    /** slugConfirm only: label above the input box. */
    confirmInputLabel?: LocalizedLabel;
    /** textInput/select only: form field name baked into FormData. */
    inputName?: string;
    /** textInput/select only: label above the input. */
    inputLabel?: LocalizedLabel;
    /** textInput/select only: placeholder. */
    placeholder?: LocalizedLabel;
    /** textInput only. */
    required?: boolean;
    maxLength?: number;
    /** select only: list of options. */
    options?: Array<{ value: string; label: string }>;
    /** select only: message when options array is empty. */
    empty?: LocalizedLabel;
  };
};

export type CatalogListConfig = {
  columns: CatalogListColumn[];
  chips?: CatalogListChip[];
  searchable?: boolean;
  /**
   * Visual layout for the list page. Defaults to 'table'. 'invoice-card' uses
   * the polished invoice-list component (sales-invoice, payment-received, etc).
   * Both layouts run through `renderV2CatalogList`.
   */
  layout?: CatalogListLayout;
  /**
   * When true, suppresses the "New" CTA + /new + /[id] edit links. Used for
   * read-only catalogs like admin.audit (entries created by the engine, not UI).
   */
  listOnly?: boolean;
  /**
   * Builds the detail-route href for a row's first column. ONLY catalogs that
   * actually have a detail page (super-admin tenant, user) set this. When
   * omitted, the first column renders as plain text — list-only catalogs
   * (audit, support, billing, mobile, …) have no detail route, so wrapping the
   * cell in a link would 404. Note: `listOnly` is about create/edit, NOT the
   * detail view — `super_admin.tenant` is both `listOnly` AND has a detail page.
   */
  detailHref?: (id: string) => string;
  /**
   * Optional per-row action menu. Each entry becomes a small button in an
   * extra last column on the list table. Used by super-admin catalogs for
   * surgical mutations (revoke api_key, close support_ticket).
   */
  rowActions?: SaCatalogRowAction[];
};

export type CatalogConfig = {
  id: string;
  module: string;
  name: string;
  label: LocalizedLabel;
  pluralLabel?: LocalizedLabel;
  fields: Record<string, FieldConfig>;
  permissions: Permissions;
  icon?: string;
  displayField?: string;
  presentation?: PresentationFn;
  /** Hide from sidebar nav while keeping the catalog reachable via direct URL and inline ref pickers. */
  sidebarHidden?: boolean;
  /** Optional list-page configuration (layout, columns, chips, searchable, listOnly). */
  list?: CatalogListConfig;
  /**
   * When set, creating a record whose value for this field duplicates an
   * existing active record returns a soft `warning` (not a hard error) so the
   * form can prompt "create anyway?" — for catalogs where same-named items are
   * legitimate but usually a mistake (e.g. product name; SKU stays unique).
   * QA M5 (design D6).
   */
  warnDuplicateField?: string;
};

// ─── Documents ──────────────────────────────────────────────────────────────

export type DocumentStatus = 'SAVED' | 'POSTED';
export type MovementKind = 'income' | 'expense';

export type Movement = {
  kind: MovementKind;
  timestamp: Date;
} & Record<string, unknown>;

export type DocumentLineRow = Record<string, unknown>;

export type DocumentRowWithLines = Record<string, unknown> & {
  lines?: Record<string, DocumentLineRow[]>;
};

export type PostingFn = (
  doc: DocumentRowWithLines,
  ctx: PostingContext,
) => Movement[] | Record<string, unknown>[] | Promise<Movement[] | Record<string, unknown>[]>;

export type PrePostValidator = (
  doc: DocumentRowWithLines,
  ctx: PostingContext,
) => Promise<{ ok: true } | { ok: false; message: string }>;

export type PostingContext = {
  /** Active Prisma transaction client; tenant-scoped via withTenant GUC. Use this for any auxiliary lookups during posting (e.g. validators). */
  tx: unknown;
  register(id: string): {
    /** Signed sum of the primary resource as { quantity }. Use balanceAll when you need multiple resources. */
    balance(filter: Record<string, unknown>): Promise<{ quantity: number }>;
    /** Signed sum of every resource declared on the register, keyed by resource name. Missing resources default to 0. */
    balanceAll(filter: Record<string, unknown>): Promise<Record<string, number>>;
  };
};

export type LineSectionConfig = {
  label: LocalizedLabel;
  pluralLabel?: LocalizedLabel;
  minRows?: number;
  fields: Record<string, FieldConfig>;
  /**
   * Sprint 30: opt-in UI behavior. 'sales' enables the stock chip row,
   * auto-price resolution, and below-cost validation on LineFieldArray.
   * 'price-setting' (added 2026-05-01) shows the live avg cost as a hint
   * and warns when the entered price is below cost. Default
   * ('default'/undefined) is the plain tabular editor used by purchase
   * invoice, payments, etc.
   */
  lineBehavior?: 'default' | 'sales' | 'price-setting' | 'returnFromInvoice';
};

/**
 * Where a row-action's mapped value should be read from at resolve time.
 * MUST stay plain data so the config survives the RSC server→client
 * boundary — no function refs, no closures.
 *
 *  - `{ source: 'self.id' }`            doc's primary id
 *  - `{ source: 'self.field', field }`  any header field on the source doc
 *  - `{ source: 'refLabel', field }`    resolved name for a reference field
 *                                       (e.g. customer.name for `customer`)
 *  - `{ source: 'openBalance.original' }`  computed open balance, original currency
 *  - `{ source: 'openBalance.amount' }`    computed open balance, base currency
 */
export type RowActionSource =
  | { source: 'self.id' }
  | { source: 'self.field'; field: string }
  | { source: 'refLabel'; field: string }
  | { source: 'openBalance.original' }
  | { source: 'openBalance.amount' };

/**
 * Predicates that all must hold for the action to be shown for a row.
 * Each predicate is plain data; the resolver implements semantics.
 */
export type RowActionVisibility = {
  /** Row's `status` must equal this (single string or one of an array). */
  status?: string | string[];
  /**
   * Row's open balance on the named register must be > `gt` (default 0).
   * Triggers an aggregate lookup at resolve time.
   */
  openBalance?: {
    register: 'sales.accounts_receivable' | 'purchases.accounts_payable';
    gt?: number;
  };
};

/**
 * Declarative shortcut from one document type to another, surfaced as a
 * per-row button on list pages. Replaces ad-hoc "open new X with prefill"
 * wiring with metadata so multiple list pages stay in sync without
 * duplicating logic.
 *
 * Resolver: `platform/engine/resolve-row-actions.ts`
 * Renderer: V2 invoice list rows read the resolved `{ href, label }` array.
 */
export type RowActionConfig = {
  /** Stable key for testing + i18n; not user-visible. */
  key: string;
  label: LocalizedLabel;
  /** Lucide icon name (e.g. 'HandCoins'). Renderer maps to component. */
  icon?: string;
  /** Target document key (e.g. 'sales.payment_received'). Engine maps to URL. */
  target: string;
  /** Query-param key → source descriptor. Keys land in the target's `?...`. */
  map: Record<string, RowActionSource>;
  visibleWhen?: RowActionVisibility;
};

export type DocumentConfig = {
  id: string;
  module: string;
  name: string;
  label: LocalizedLabel;
  pluralLabel?: LocalizedLabel;
  header: Record<string, FieldConfig>;
  lines?: Record<string, LineSectionConfig>;
  posting: Record<string, PostingFn>;
  validators?: { prePost?: PrePostValidator[] };
  permissions: DocumentPermissions;
  icon?: string;
  displayField?: string;
  presentation?: PresentationFn;
  /** Optional: render a direction badge and sign movement amounts. */
  direction?: 'in' | 'out';
  /** Optional per-row action shortcuts surfaced on the list page. */
  rowActions?: RowActionConfig[];
};

// ─── Accumulation Registers ────────────────────────────────────────────────

export type AccumulationRegisterConfig = {
  id: string;
  module: string;
  name: string;
  label: LocalizedLabel;
  icon?: string;
  dimensions: Record<string, FieldConfig>;
  resources: Record<string, NumberFieldConfig | MoneyFieldConfig>;
  /**
   * Optional ordered list of column accessorKeys for the register viewer table.
   * Keys may refer to dimensions, resources, or built-ins ('timestamp', 'kind',
   * 'docRef'). Keys not listed fall through to their default order AFTER the
   * explicitly ordered ones.
   */
  listColumnOrder?: string[];
};

// ─── Information Registers (periodic snapshots, 1C "Регистр сведений") ───

export type Periodicity = 'date' | 'datetime';

export type InformationRegisterConfig = {
  id: string;
  module: string;
  name: string;
  label: LocalizedLabel;
  pluralLabel?: LocalizedLabel;
  icon?: string;
  periodicity: Periodicity;
  /** Composite key per period; lookups happen by these. */
  dimensions: Record<string, ReferenceFieldConfig>;
  /** Stored values per (period, dimensions). */
  resources: Record<string, NumberFieldConfig | MoneyFieldConfig>;
  /** The single document type allowed to post to this register. */
  recorder: { module: string; name: string };
  permissions: { read: 'any' | 'admin' };
  listColumnOrder?: string[];
};

export type SettingsScope = 'tenant' | 'user';

export type SettingsConfig = {
  /** `<module>.<name>` — same composite-id convention as catalogs/docs. */
  id: string;
  module: string;
  name: string;
  label: LocalizedLabel;
  scope?: SettingsScope; // default 'tenant'
  fields: Record<string, FieldConfig>;
  /**
   * Optional zod schema for stronger validation of submitted payload. When
   * absent, the engine only validates field-level types.
   *
   * MUST be the result of `z.object(...)` — kept as a value rather than a
   * type so the action layer can call .safeParse() at submit time.
   */
  schema?: unknown; // Zod schema, kept untyped to avoid pulling zod into types.ts
};

/**
 * Loader function signature for super-admin catalogs. Receives a Prisma
 * transaction client that is already running inside `withBypass` (RLS off,
 * cross-tenant queries allowed). Returns rows + total for the requested page.
 *
 * Lives in the config (server-only) — never crosses the RSC boundary to the
 * client, mirroring the posting functions in DocumentConfig.
 */
export type SuperAdminCatalogLoader = (params: {
  tx: unknown;
  search?: string;
  chip?: string;
  page: number;
  pageSize: number;
}) => Promise<{
  rows: Array<Record<string, unknown> & { id: string }>;
  total: number;
}>;

/**
 * Declarative loader spec for super-admin catalogs. The engine derives a
 * standard findMany + count loader from this metadata — no inline Prisma
 * boilerplate per catalog. Use the `loader` escape hatch instead when the
 * catalog needs post-query filters (e.g. multitenant), $queryRaw, or other
 * non-trivial query shapes.
 *
 * The engine handles search OR-building, chip → where merging, pagination,
 * and count in parallel. Use `include` for cheap relation joins; use
 * `postFetch` when batched related lookups (e.g. tenant-name resolution
 * across rows without a declared relation) are needed.
 */
export type SuperAdminCatalogSourceSpec = {
  /** Prisma model camelCase name (e.g. 'platformAuditLog', 'billingEvent'). */
  source: string;
  /** Fields to ILIKE-search (contains, case-insensitive). */
  searchFields?: string[];
  /** Fields to match exactly (e.g. clerkId, slug). */
  searchExactFields?: string[];
  /** Chip key → Prisma where subset. 'all' is implicit (no chip filter). */
  chipFilters?: Record<string, Record<string, unknown>>;
  /** Always-applied where filter (e.g. {deletedAt: null}). */
  baseWhere?: Record<string, unknown>;
  /** Prisma include for cheap relation joins (rendered tenantName, etc.). */
  include?: Record<string, unknown>;
  /** Prisma orderBy. Defaults to {createdAt: 'desc'}. */
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * Per-row mapper from raw Prisma row to display row. Required when
   * `postFetch` is absent. Skipped when `postFetch` is set (postFetch is
   * responsible for the full mapping).
   */
  map?: (row: Record<string, unknown>) => Record<string, unknown> & { id: string };
  /**
   * Optional post-fetch hook for batched related lookups. Runs once with the
   * full page of raw rows + the same withBypass tx. Returns the final
   * display rows. When set, `map` is ignored.
   */
  postFetch?: (
    rows: Array<Record<string, unknown>>,
    tx: unknown,
  ) => Promise<Array<Record<string, unknown> & { id: string }>>;
};

/**
 * Lucide icon name as a raw string. Resolved client-side by the tabs nav via
 * an `iconRegistry` map. Kept as a string (not a component reference) so the
 * super-admin catalog config survives the RSC server→client boundary.
 */
export type LucideIconName = string;

/**
 * Server-component render entry point for a super-admin catalog detail tab.
 * Receives the row id (parent param) + active locale; returns the tab body
 * JSX. The render function is invoked inside `renderV2SuperAdminCatalogDetail`
 * AFTER the layout-level platform-admin gate, so it can assume the caller is
 * authorized.
 */
export type SuperAdminCatalogTabRender = (params: {
  id: string;
  locale: Locale;
}) => Promise<ReactNode> | ReactNode;

export type SuperAdminCatalogTabConfig = {
  /**
   * Stable identifier — used as the lookup key inside the detail config AND
   * conventionally as the i18n key under `v2_super_admin.<short>.detail.tabs.<key>`.
   * Snake_case (`/^[a-z][a-z0-9_]*$/`).
   */
  key: string;
  /**
   * URL segment relative to /super-admin/<plural>/[id]/. Empty string
   * (`''`) means the root index page (no segment). Otherwise matches
   * `/^[a-z][a-z0-9_-]*$/`.
   */
  segment: string;
  /**
   * Lucide icon name (e.g. `'LayoutDashboard'`). Resolved client-side by the
   * generic tabs nav. Unknown names render a fallback (`'Square'`).
   */
  icon: LucideIconName;
  /** Optional plain-string badge (row count or tag) rendered next to the label. */
  badge?: string;
  /** Server-component render entry point — see SuperAdminCatalogTabRender. */
  render: SuperAdminCatalogTabRender;
};

export type SuperAdminCatalogDetailConfig = {
  /** Ordered list of detail tabs surfaced by the generic detail shell. */
  tabs: SuperAdminCatalogTabConfig[];
};

/**
 * Variant of CatalogConfig for cross-tenant administrative entities (tenants
 * themselves, cross-tenant users, system-wide audit). Shells render under
 * `withBypass` + assert the caller has `super_admin.*` permission. Otherwise
 * shape is identical to CatalogConfig.
 */
export type SuperAdminCatalogConfig = Omit<CatalogConfig, 'permissions'> & {
  /** Always true — distinguishes from regular CatalogConfig at the type level. */
  crossTenant: true;
  /**
   * Required permission to access this catalog. Always under the
   * `super_admin.*` namespace. Asserted by the shell.
   */
  requiredPermission: string;
  /**
   * Cross-tenant data loader. Runs inside `withBypass`. The engine fills this
   * automatically from `source` if not provided. Provide manually only when
   * the catalog needs post-query filters, raw SQL, or cross-table aggregates
   * that the declarative spec can't express.
   */
  loader: SuperAdminCatalogLoader;
  /**
   * Optional declarative source spec. When set AND `loader` is absent, the
   * engine derives a standard findMany + count loader from this metadata.
   * Cleaner than inline Prisma boilerplate for the common case.
   */
  source?: SuperAdminCatalogSourceSpec;
  /**
   * Optional detail-page DSL. When present, the catalog declares its detail
   * tabs (overview/addons/etc.) here instead of relying on bespoke per-route
   * page.tsx files. Rendered via `renderV2SuperAdminCatalogDetail`.
   */
  detail?: SuperAdminCatalogDetailConfig;
};

export type RegisterConfig = AccumulationRegisterConfig | InformationRegisterConfig;
export type AnyConfig = CatalogConfig | DocumentConfig | RegisterConfig;

export function isAccumulationRegister(r: RegisterConfig): r is AccumulationRegisterConfig {
  return 'dimensions' in r && 'resources' in r && !('periodicity' in r);
}
export function isInformationRegister(r: RegisterConfig): r is InformationRegisterConfig {
  return 'periodicity' in r;
}
