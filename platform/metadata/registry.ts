import type {
  AccumulationRegisterConfig,
  CatalogConfig,
  DocumentConfig,
  InformationRegisterConfig,
  RegisterConfig,
  SuperAdminCatalogConfig,
} from './types';
import { isAccumulationRegister, isInformationRegister } from './types';

type Registry = {
  catalog: Record<string, CatalogConfig>;
  document: Record<string, DocumentConfig>;
  /** All registers, keyed by full id ("module.name"). Use the type guards below. */
  register: Record<string, RegisterConfig>;
  /** Convenience views, materialised on insert. */
  accumulationRegister: Record<string, AccumulationRegisterConfig>;
  informationRegister: Record<string, InformationRegisterConfig>;
  superAdminCatalog: Record<string, SuperAdminCatalogConfig>;
};

const _registry: Registry = {
  catalog: {},
  document: {},
  register: {},
  accumulationRegister: {},
  informationRegister: {},
  superAdminCatalog: {},
};

export function registerCatalog(cfg: CatalogConfig): void {
  registerInto(_registry.catalog, cfg);
}

export function registerDocument(cfg: DocumentConfig): void {
  registerInto(_registry.document, cfg);
}

export function registerAccumulationRegister(cfg: AccumulationRegisterConfig): void {
  registerInto(_registry.register, cfg);
  registerInto(_registry.accumulationRegister, cfg);
}

export function registerInformationRegister(cfg: InformationRegisterConfig): void {
  registerInto(_registry.register, cfg);
  registerInto(_registry.informationRegister, cfg);
}

/** @deprecated kept for source compat; routes to accumulationRegister */
export function registerRegister(cfg: AccumulationRegisterConfig): void {
  registerAccumulationRegister(cfg);
}

function registerInto<T extends { id: string }>(map: Record<string, T>, cfg: T): void {
  const existing = map[cfg.id];
  if (existing === cfg) return;
  if (existing) {
    // Under `next dev` (HMR), config modules are re-evaluated on edit and we
    // get a fresh object with the same id. Overwrite silently. Production and
    // tests still throw so genuine duplicate registrations are caught.
    if (process.env.NODE_ENV === 'development') {
      map[cfg.id] = cfg;
      return;
    }
    throw new Error(`metadata: "${cfg.id}" already registered`);
  }
  map[cfg.id] = cfg;
}

export function getRegistry(): Readonly<Registry> {
  return _registry;
}

export function registerSuperAdminCatalog(cfg: SuperAdminCatalogConfig): void {
  if (_registry.superAdminCatalog[cfg.id]) {
    throw new Error(`defineSuperAdminCatalog: ${cfg.id} is already registered`);
  }
  _registry.superAdminCatalog[cfg.id] = cfg;
}

export function clearRegistry(): void {
  _registry.catalog = {};
  _registry.document = {};
  _registry.register = {};
  _registry.accumulationRegister = {};
  _registry.informationRegister = {};
  _registry.superAdminCatalog = {};
}

export function _resetRegistry(): void {
  _registry.catalog = {};
  _registry.document = {};
  _registry.register = {};
  _registry.accumulationRegister = {};
  _registry.informationRegister = {};
  _registry.superAdminCatalog = {};
}

export { isAccumulationRegister, isInformationRegister };
