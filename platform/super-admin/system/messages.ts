/**
 * Load the `superAdminPro.system` + `superAdminPro.mobile` slices from
 * `messages/<locale>.json` for the Super Admin operator's current locale.
 *
 * Super-admin routes live outside the `[locale]` segment, so `next-intl`'s
 * request context is not bound. We read the SA locale cookie ourselves and
 * import the relevant catalog directly.
 */
import 'server-only';

import type { SuperAdminLocale } from '@/platform/super-admin/i18n';
import { getSuperAdminLocale } from '@/platform/super-admin/i18n-server';

interface MaintenanceMessages {
  title: string;
  subtitle: string;
  description: string;
  countdownLabel: string;
  countdownEnded: string;
  noEta: string;
  operatorNote: string;
  retry: string;
  statusLabel: string;
  statusValue: string;
}

interface SystemDbCardMessages {
  title: string;
  description: string;
  totalSize: string;
  connections: string;
  topTables: string;
  schemaColumn: string;
  tableColumn: string;
  sizeColumn: string;
  rowsColumn: string;
  unavailable: string;
  unavailableHint: string;
}

interface SystemSlowQueriesMessages {
  title: string;
  description: string;
  enableHint: string;
  queryColumn: string;
  callsColumn: string;
  totalColumn: string;
  meanColumn: string;
  empty: string;
}

interface SystemCronMessages {
  title: string;
  description: string;
  schedulesTitle: string;
  schedulesDescription: string;
  job: string;
  schedule: string;
  lastRun: string;
  status: string;
  startedAt: string;
  duration: string;
  output: string;
  errorMessage: string;
  empty: string;
  neverRan: string;
}

interface SystemDeployMessages {
  title: string;
  description: string;
  deploymentId: string;
  url: string;
  state: string;
  createdAt: string;
  gitSha: string;
  unavailable: string;
  fallbackReason: string;
}

interface SystemMaintenanceMessages {
  title: string;
  description: string;
  currentlyEnabled: string;
  currentlyDisabled: string;
  toggleLabel: string;
  untilLabel: string;
  messageLabel: string;
  save: string;
  confirmTitle: string;
  confirmBody: string;
  confirmDisableTitle: string;
  confirmDisableBody: string;
  confirmYes: string;
  confirmCancel: string;
}

interface SystemReadonlyMessages {
  title: string;
  description: string;
  currentlyEnabled: string;
  currentlyDisabled: string;
  toggleLabel: string;
  save: string;
  confirmTitle: string;
  confirmBody: string;
  confirmDisableTitle: string;
  confirmDisableBody: string;
  confirmYes: string;
  confirmCancel: string;
}

interface SystemSettingsMessages {
  title: string;
  subtitle: string;
  rowsTitle: string;
  rowsDescription: string;
  keyColumn: string;
  valueColumn: string;
  updatedAtColumn: string;
  updatedByColumn: string;
  actionsColumn: string;
  empty: string;
  save: string;
  delete: string;
  addTitle: string;
  addDescription: string;
  keyLabel: string;
  valueLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  create: string;
  envTitle: string;
  envDescription: string;
  envConfigured: string;
  envMissing: string;
  errorInvalidJson: string;
  errorEmptyKey: string;
  confirmDeleteTitle: string;
  confirmDeleteBody: string;
  confirmDeleteYes: string;
  confirmDeleteCancel: string;
}

interface SystemApiKeysMessages {
  title: string;
  subtitle: string;
  tableTitle: string;
  tenantColumn: string;
  nameColumn: string;
  prefixColumn: string;
  scopeColumn: string;
  createdAtColumn: string;
  createdByColumn: string;
  lastUsedColumn: string;
  statusColumn: string;
  actionsColumn: string;
  active: string;
  revoked: string;
  neverUsed: string;
  revoke: string;
  empty: string;
  showRevoked: string;
  hideRevoked: string;
  filterTenant: string;
  apply: string;
  reset: string;
  confirmRevokeTitle: string;
  confirmRevokeBody: string;
  confirmRevokeYes: string;
  confirmRevokeCancel: string;
}

interface SystemMessages {
  title: string;
  subtitle: string;
  tabs: { overview: string; settings: string; apiKeys: string };
  dbCard: SystemDbCardMessages;
  slowQueries: SystemSlowQueriesMessages;
  cron: SystemCronMessages;
  deploy: SystemDeployMessages;
  maintenance: SystemMaintenanceMessages;
  readonly: SystemReadonlyMessages;
  settings: SystemSettingsMessages;
  apiKeys: SystemApiKeysMessages;
}

interface MobileMinVersionsMessages {
  title: string;
  description: string;
  iosLabel: string;
  androidLabel: string;
  placeholder: string;
  save: string;
  saved: string;
  clear: string;
}

interface MobileTokensMessages {
  title: string;
  description: string;
  filterTenant: string;
  apply: string;
  reset: string;
  tenantColumn: string;
  userColumn: string;
  platformColumn: string;
  deviceColumn: string;
  tokenColumn: string;
  createdAtColumn: string;
  lastUsedColumn: string;
  actionsColumn: string;
  sendTest: string;
  empty: string;
  loadMore: string;
  testTitle: string;
  testDescription: string;
  testTitleField: string;
  testBodyField: string;
  testTitleDefault: string;
  testBodyDefault: string;
  testSend: string;
  testCancel: string;
  testSentToast: string;
  testFailedToast: string;
}

interface MobileDistributionMessages {
  title: string;
  description: string;
  platformLabel: string;
  countLabel: string;
  empty: string;
}

interface MobileMessages {
  title: string;
  subtitle: string;
  minVersions: MobileMinVersionsMessages;
  tokens: MobileTokensMessages;
  distribution: MobileDistributionMessages;
}

export interface SuperAdminProMessages {
  system: SystemMessages;
  mobile: MobileMessages;
  maintenance: MaintenanceMessages;
}

interface MessagesShape {
  superAdminPro?: { system?: SystemMessages; mobile?: MobileMessages };
  maintenance?: MaintenanceMessages;
}

async function importMessages(locale: SuperAdminLocale): Promise<MessagesShape> {
  // Use a static-ish import path — Webpack/Turbopack include every locale
  // because of the dynamic specifier. Acceptable: catalogs are small.
  const mod = (await import(`@/messages/${locale}.json`)) as { default: MessagesShape };
  return mod.default;
}

export async function getSuperAdminProMessages(): Promise<SuperAdminProMessages> {
  const locale = await getSuperAdminLocale();
  const data = await importMessages(locale);
  const system = data.superAdminPro?.system;
  const mobile = data.superAdminPro?.mobile;
  const maintenance = data.maintenance;
  if (!system || !mobile || !maintenance) {
    // Fallback to English so the page renders even if a locale catalog is
    // partial — should not happen because the synchronizer copies the EN
    // block into every locale, but defensive is cheap.
    const en = await importMessages('en' as SuperAdminLocale);
    return {
      system: system ?? (en.superAdminPro?.system as SystemMessages),
      mobile: mobile ?? (en.superAdminPro?.mobile as MobileMessages),
      maintenance: maintenance ?? (en.maintenance as MaintenanceMessages),
    };
  }
  return { system, mobile, maintenance };
}
