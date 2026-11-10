import { parseFormula } from './formula';
import {
  registerCatalog,
  registerDocument,
  registerInformationRegister,
  registerRegister,
  registerSuperAdminCatalog,
} from './registry';
import { buildAutoLoader } from './super-admin-auto-loader';
import type {
  AccumulationRegisterConfig,
  CatalogConfig,
  DocumentConfig,
  FieldConfig,
  InformationRegisterConfig,
  LineSectionConfig,
  SuperAdminCatalogConfig,
  SuperAdminCatalogDetailConfig,
  SuperAdminCatalogTabConfig,
} from './types';

const ID_RE = /^[a-z][a-z0-9_]*$/;
const TAB_SEGMENT_RE = /^[a-z][a-z0-9_-]*$/;
const FIELD_RE = /^[a-z][a-zA-Z0-9]*$/;
const RESERVED_LINE_FIELDS = new Set([
  'id',
  'tenantId',
  'documentId',
  'sequence',
  'createdAt',
  'updatedAt',
]);

type DefineCatalogInput = Omit<CatalogConfig, 'id'>;

export function defineCatalog(input: DefineCatalogInput): CatalogConfig {
  validateId('defineCatalog', input.module, input.name);
  validateFields(input.fields);
  const cfg: CatalogConfig = { id: `${input.module}.${input.name}`, ...input };
  registerCatalog(cfg);
  return cfg;
}

type DefineDocumentInput = Omit<DocumentConfig, 'id'>;

export function defineDocument(input: DefineDocumentInput): DocumentConfig {
  validateId('defineDocument', input.module, input.name);
  validateFields(input.header);
  if (input.lines) validateLines(input.lines);
  const cfg: DocumentConfig = { id: `${input.module}.${input.name}`, ...input };
  registerDocument(cfg);
  return cfg;
}

type DefineRegisterInput = Omit<AccumulationRegisterConfig, 'id'>;

export function defineAccumulationRegister(input: DefineRegisterInput): AccumulationRegisterConfig {
  validateId('defineAccumulationRegister', input.module, input.name);
  const cfg: AccumulationRegisterConfig = {
    id: `${input.module}.${input.name}`,
    ...input,
  };
  registerRegister(cfg);
  return cfg;
}

type DefineInformationRegisterInput = Omit<InformationRegisterConfig, 'id'>;

export function defineInformationRegister(
  input: DefineInformationRegisterInput,
): InformationRegisterConfig {
  validateId('defineInformationRegister', input.module, input.name);
  if (Object.keys(input.dimensions).length === 0) {
    throw new Error('defineInformationRegister: at least one dimension required');
  }
  if (Object.keys(input.resources).length === 0) {
    throw new Error('defineInformationRegister: at least one resource required');
  }
  const cfg: InformationRegisterConfig = { id: `${input.module}.${input.name}`, ...input };
  registerInformationRegister(cfg);
  return cfg;
}

export function defineSuperAdminCatalogTab(
  input: SuperAdminCatalogTabConfig,
): SuperAdminCatalogTabConfig {
  if (!input.key || !ID_RE.test(input.key)) {
    throw new Error(
      `defineSuperAdminCatalogTab: key must be snake_case (got ${JSON.stringify(input.key)})`,
    );
  }
  if (input.segment !== '' && !TAB_SEGMENT_RE.test(input.segment)) {
    throw new Error(
      `defineSuperAdminCatalogTab(${input.key}): segment must be '' or match /^[a-z][a-z0-9_-]*$/ (got ${JSON.stringify(input.segment)})`,
    );
  }
  if (!input.icon || typeof input.icon !== 'string') {
    throw new Error(
      `defineSuperAdminCatalogTab(${input.key}): icon is required (non-empty string)`,
    );
  }
  if (typeof input.render !== 'function') {
    throw new Error(`defineSuperAdminCatalogTab(${input.key}): render must be a function`);
  }
  return input;
}

export function defineSuperAdminCatalogDetail(
  input: SuperAdminCatalogDetailConfig,
): SuperAdminCatalogDetailConfig {
  if (!Array.isArray(input.tabs) || input.tabs.length === 0) {
    throw new Error('defineSuperAdminCatalogDetail: tabs must be a non-empty array');
  }
  const seenKeys = new Set<string>();
  const seenSegments = new Set<string>();
  for (const tab of input.tabs) {
    if (seenKeys.has(tab.key)) {
      throw new Error(`defineSuperAdminCatalogDetail: duplicate tab key "${tab.key}"`);
    }
    seenKeys.add(tab.key);
    if (seenSegments.has(tab.segment)) {
      throw new Error(
        `defineSuperAdminCatalogDetail: duplicate tab segment "${tab.segment}" (keys involved include "${tab.key}")`,
      );
    }
    seenSegments.add(tab.segment);
  }
  return input;
}

type DefineSuperAdminCatalogInput = Omit<
  SuperAdminCatalogConfig,
  'id' | 'crossTenant' | 'loader'
> & {
  /** Provide either `loader` (bespoke) OR `source` (declarative). At least one is required. */
  loader?: SuperAdminCatalogConfig['loader'];
};

export function defineSuperAdminCatalog(
  input: DefineSuperAdminCatalogInput,
): SuperAdminCatalogConfig {
  validateId('defineSuperAdminCatalog', input.module, input.name);
  validateFields(input.fields);
  if (!input.requiredPermission || typeof input.requiredPermission !== 'string') {
    throw new Error(
      `defineSuperAdminCatalog(${input.module}.${input.name}): requiredPermission is required (a string like 'super_admin.tenant:read')`,
    );
  }

  let loader = input.loader;
  if (!loader) {
    if (!input.source) {
      throw new Error(
        `defineSuperAdminCatalog(${input.module}.${input.name}): either loader or source is required`,
      );
    }
    loader = buildAutoLoader(input.source);
  }

  const cfg: SuperAdminCatalogConfig = {
    id: `${input.module}.${input.name}`,
    crossTenant: true,
    ...input,
    loader,
  };
  registerSuperAdminCatalog(cfg);
  return cfg;
}

function validateId(fn: string, module: string, name: string): void {
  if (!ID_RE.test(module) || !ID_RE.test(name)) {
    throw new Error(`${fn}: module and name must be snake_case identifiers`);
  }
}

function validateFields(fields: Record<string, FieldConfig>): void {
  for (const [fieldName, cfg] of Object.entries(fields)) {
    if (!FIELD_RE.test(fieldName)) {
      throw new Error(`field "${fieldName}" must be camelCase`);
    }
    if ((cfg.type === 'number' || cfg.type === 'money') && cfg.formula) {
      parseFormula(cfg.formula);
    }
  }
}

function validateLines(lines: Record<string, LineSectionConfig>): void {
  for (const [sectionKey, section] of Object.entries(lines)) {
    if (!FIELD_RE.test(sectionKey)) {
      throw new Error(`line section "${sectionKey}" must be camelCase`);
    }
    for (const fieldName of Object.keys(section.fields)) {
      if (RESERVED_LINE_FIELDS.has(fieldName)) {
        throw new Error(`line field "${sectionKey}.${fieldName}" uses reserved system column name`);
      }
    }
    validateFields(section.fields);
  }
}
