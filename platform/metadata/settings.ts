import type { SettingsConfig } from './types';

const ID_RE = /^[a-z][a-z0-9_]*$/;

type SettingsRegistry = {
  settings: Map<string, SettingsConfig>;
};

let registry: SettingsRegistry = { settings: new Map() };

export type DefineSettingsInput = Omit<SettingsConfig, 'id' | 'scope'> & {
  scope?: SettingsConfig['scope'];
};

export function defineSettings(input: DefineSettingsInput): SettingsConfig {
  if (!ID_RE.test(input.module) || !ID_RE.test(input.name)) {
    throw new Error(
      `defineSettings(${input.module}.${input.name}): module and name must be snake_case identifiers`,
    );
  }
  const id = `${input.module}.${input.name}`;
  if (registry.settings.has(id)) {
    throw new Error(`defineSettings: ${id} is already registered`);
  }
  const cfg: SettingsConfig = { ...input, id, scope: input.scope ?? 'tenant' };
  registry.settings.set(id, cfg);
  return cfg;
}

export function getSettingsRegistry(): Readonly<SettingsRegistry> {
  return registry;
}

/** Test-only — never call from production code. */
export function _resetSettingsRegistry(): void {
  registry = { settings: new Map() };
}
